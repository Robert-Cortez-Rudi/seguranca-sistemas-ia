import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { listProducts, parseSearch } from "@/lib/services/catalog";
import {
  getMonitorCounts,
  listMonitorProducts,
  listMonitorTransactions,
  listMonitorUsers,
  MONITOR_PAGE_SIZE,
  parseMonitorPage,
  parseMonitorTab,
} from "@/lib/services/monitor";
import { processPaymentWebhook, signWebhook } from "@/lib/services/payment";
import { resetDb } from "../helpers/db";
import { createUser, ctx } from "../helpers/factory";

beforeEach(resetDb);

/** Pedido de 45,00 aguardando pagamento, com cartão de teste. */
async function pendingOrder() {
  const seller = await createUser({ role: "SELLER" });
  const product = await db.product.create({ data: { sellerId: seller.id, name: "Caneca", description: "d", priceCents: 3000, stock: 5 } });
  const customer = await createUser();
  const card = await db.paymentCard.create({
    data: { userId: customer.id, numberEnc: encrypt("4242424242424242", "card.number"), holderEnc: encrypt("X", "card.holder"), last4: "4242", brand: "VISA", expMonth: 12, expYear: 2030 },
  });
  const order = await db.order.create({
    data: {
      userId: customer.id,
      paymentCardId: card.id,
      subtotalCents: 3000,
      shippingCents: 1500,
      totalCents: 4500,
      shippingUf: "SP",
      shippingAddressEnc: encrypt("{}", "order.address"),
      items: { create: [{ productId: product.id, sellerId: seller.id, productName: "Caneca", quantity: 1, unitPriceCents: 3000 }] },
    },
  });
  return { customer, order };
}

async function pay(orderId: string, overrides: Record<string, unknown> = {}) {
  const body = JSON.stringify({ eventId: `evt_${randomBytes(12).toString("base64url")}`, orderId, status: "approved", amountCents: 4500, ...overrides });
  const timestamp = String(Math.floor(Date.now() / 1000));
  return { body, res: await processPaymentWebhook(body, { timestamp, signature: signWebhook(timestamp, body) }, ctx()) };
}

describe("transações de pagamento registradas pelo webhook (A08/A09)", () => {
  it("aprovado e recusado viram transações APPROVED e DECLINED", async () => {
    const a = await pendingOrder();
    const b = await pendingOrder();
    await pay(a.order.id);
    await pay(b.order.id, { status: "declined" });
    const rows = await db.paymentTransaction.findMany({ orderBy: { createdAt: "asc" } });
    expect(rows.map((r) => [r.orderId, r.result, r.amountCents])).toEqual([
      [a.order.id, "APPROVED", 4500],
      [b.order.id, "DECLINED", 4500],
    ]);
  });

  it("evento assinado mas com valor errado vira REJECTED com o motivo", async () => {
    const { order } = await pendingOrder();
    const { res } = await pay(order.id, { amountCents: 1 });
    expect(res.status).toBe(400);
    const tx = await db.paymentTransaction.findFirstOrThrow({ where: { orderId: order.id } });
    expect(tx.result).toBe("REJECTED");
    expect(tx.reason).toBe("amount_mismatch");
  });

  it("replay não cria uma segunda transação", async () => {
    const { order } = await pendingOrder();
    const { body } = await pay(order.id);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const replay = await processPaymentWebhook(body, { timestamp, signature: signWebhook(timestamp, body) }, ctx());
    expect(replay.status).toBe(409);
    expect(await db.paymentTransaction.count()).toBe(1);
  });

  it("assinatura forjada não gera transação", async () => {
    const { order } = await pendingOrder();
    const body = JSON.stringify({ eventId: `evt_${randomBytes(12).toString("base64url")}`, orderId: order.id, status: "approved", amountCents: 4500 });
    const ts = String(Math.floor(Date.now() / 1000));
    expect((await processPaymentWebhook(body, { timestamp: ts, signature: "0".repeat(64) }, ctx())).status).toBe(401);
    expect(await db.paymentTransaction.count()).toBe(0);
  });
});

describe("monitor do admin (A01/A04)", () => {
  it("conta usuários, pedidos e transações por tipo", async () => {
    const a = await pendingOrder();
    const b = await pendingOrder();
    await pay(a.order.id);
    await pay(b.order.id, { status: "declined" });
    const c = await getMonitorCounts();
    expect(c.users).toMatchObject({ total: 4, byRole: { CUSTOMER: 2, SELLER: 2 } });
    expect(c.users.recent).toBe(4);
    expect(c.orders).toMatchObject({ total: 2, byStatus: { PAID: 1, CANCELED: 1 } });
    expect(c.transactions).toMatchObject({ total: 2, byResult: { APPROVED: 1, DECLINED: 1 }, approvedCents: 4500 });
  });

  it("lista usuários com CPF e telefone mascarados e sem campos secretos", async () => {
    const u = await createUser();
    await db.user.update({ where: { id: u.id }, data: { phoneEnc: encrypt("11987654321", "user.phone") } });
    const { rows } = await listMonitorUsers(1);
    const row = rows[0]!;
    expect(row.cpf).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
    expect(row.phone).toBe("(11) *****-4321");
    for (const key of ["passwordHash", "cpfEnc", "cpfHash", "phoneEnc", "totpSecretEnc"]) expect(row).not.toHaveProperty(key);
  });

  it("dado cifrado corrompido não derruba a listagem (falha fechada)", async () => {
    const u = await createUser();
    await db.user.update({ where: { id: u.id }, data: { cpfEnc: "lixo" } });
    const { rows } = await listMonitorUsers(1);
    expect(rows[0]!.cpf).toBe("***.***.***-**");
  });

  it("produtos comprados e transações mostram só o cartão mascarado", async () => {
    const { order } = await pendingOrder();
    await pay(order.id);
    const orders = await listMonitorProducts(1);
    const txs = await listMonitorTransactions(1);
    expect(orders.rows[0]!.card).toBe("VISA **** 4242");
    expect(txs.rows[0]!.card).toBe("VISA **** 4242");
    expect(JSON.stringify([orders, txs])).not.toContain("4242424242424242");
    expect(orders.rows[0]).not.toHaveProperty("shippingAddressEnc");
  });

  it("aba Produtos lista cada produto comprado com vendedor, comprador e status do pedido", async () => {
    const { customer, order } = await pendingOrder();
    await pay(order.id);
    const { rows, total } = await listMonitorProducts(1);
    expect(total).toBe(1);
    expect(rows[0]).toMatchObject({
      productName: "Caneca",
      quantity: 1,
      unitPriceCents: 3000,
      totalCents: 3000,
      stock: 5,
      orderId: order.id,
      status: "PAID",
      uf: "SP",
      customer: { email: customer.email },
    });
    expect(rows[0]!.seller.email).toMatch(/@/);
    const c = await getMonitorCounts();
    expect(c.products).toMatchObject({ total: 1, units: 1, unitsPaid: 1 });
  });

  it("pagina de 25 em 25, mais recentes primeiro", async () => {
    for (let i = 0; i < MONITOR_PAGE_SIZE + 2; i++) await createUser();
    const p1 = await listMonitorUsers(1);
    const p2 = await listMonitorUsers(2);
    expect(p1.rows).toHaveLength(MONITOR_PAGE_SIZE);
    expect(p2.rows).toHaveLength(2);
    expect(p1.pages).toBe(2);
    expect(p1.rows[0]!.createdAt.getTime()).toBeGreaterThanOrEqual(p2.rows[0]!.createdAt.getTime());
  });

  it("parâmetros da URL inválidos caem no padrão", () => {
    expect(parseMonitorTab("produtos")).toBe("produtos");
    expect(parseMonitorTab("pedidos")).toBe("usuarios");
    expect(parseMonitorTab("' OR 1=1--")).toBe("usuarios");
    expect(parseMonitorTab(["produtos"])).toBe("usuarios");
    expect(parseMonitorPage("3")).toBe(3);
    expect(parseMonitorPage("-5")).toBe(1);
    expect(parseMonitorPage("abc")).toBe(1);
    expect(parseMonitorPage("1e9")).toBe(10_000);
  });
});

describe("busca do catálogo (A05)", () => {
  it("encontra pelo nome sem diferenciar maiúsculas", async () => {
    const s = await createUser({ role: "SELLER" });
    await db.product.create({ data: { sellerId: s.id, name: "Garrafa Térmica", description: "d", priceCents: 100, stock: 1 } });
    await db.product.create({ data: { sellerId: s.id, name: "Mochila", description: "d", priceCents: 100, stock: 1 } });
    expect((await listProducts("garrafa")).map((p) => p.name)).toEqual(["Garrafa Térmica"]);
    expect(await listProducts("")).toHaveLength(2);
  });

  it("payload de injeção é tratado como texto e não devolve nada", async () => {
    const s = await createUser({ role: "SELLER" });
    await db.product.create({ data: { sellerId: s.id, name: "Caderno", description: "d", priceCents: 100, stock: 1 } });
    expect(await listProducts("' OR 1=1--")).toHaveLength(0);
    expect(await listProducts("<script>alert(1)</script>")).toHaveLength(0);
  });

  it("termo longo demais ou com caractere de controle vira busca vazia", () => {
    expect(parseSearch("a".repeat(61))).toBe("");
    expect(parseSearch("abc\u0000")).toBe("");
    expect(parseSearch(["x"])).toBe("");
    expect(parseSearch("  mouse  ")).toBe("mouse");
  });
});
