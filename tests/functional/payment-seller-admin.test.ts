import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { listUsers, updateUser } from "@/lib/services/admin";
import { login, LOGIN_ERROR } from "@/lib/services/auth";
import { processPaymentWebhook, signWebhook } from "@/lib/services/payment";
import { getSellerProduct, listSellerShipments, updateProduct, updateShipmentStatus } from "@/lib/services/seller";
import { resetDb } from "../helpers/db";
import { createUser, ctx, PASSWORD } from "../helpers/factory";

beforeEach(resetDb);

/** Pedido com itens de dois vendedores, aguardando pagamento. */
async function pendingOrder() {
  const s1 = await createUser({ role: "SELLER" });
  const s2 = await createUser({ role: "SELLER" });
  const p1 = await db.product.create({ data: { sellerId: s1.id, name: "P1", description: "d", priceCents: 1000, stock: 3 } });
  const p2 = await db.product.create({ data: { sellerId: s2.id, name: "P2", description: "d", priceCents: 2000, stock: 3 } });
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
      shippingAddressEnc: encrypt(JSON.stringify({ recipient: "Cliente", street: "Rua Z", number: "9", city: "SP" }), "order.address"),
      items: {
        create: [
          { productId: p1.id, sellerId: s1.id, productName: "P1", quantity: 1, unitPriceCents: 1000 },
          { productId: p2.id, sellerId: s2.id, productName: "P2", quantity: 1, unitPriceCents: 2000 },
        ],
      },
    },
  });
  return { s1, s2, p1, p2, customer, order };
}

function event(orderId: string, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ eventId: `evt_${randomBytes(12).toString("base64url")}`, orderId, status: "approved", amountCents: 4500, ...overrides });
}

function signed(body: string, tsOffsetSec = 0) {
  const timestamp = String(Math.floor(Date.now() / 1000) + tsOffsetSec);
  return { timestamp, signature: signWebhook(timestamp, body) };
}

describe("webhook de pagamento (A08)", () => {
  it("assinatura válida: pedido pago e uma entrega por vendedor", async () => {
    const { order, s1, s2 } = await pendingOrder();
    const body = event(order.id);
    const res = await processPaymentWebhook(body, signed(body), ctx());
    expect(res.status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    const shipments = await db.shipment.findMany({ where: { orderId: order.id } });
    expect(shipments.map((s) => s.sellerId).sort()).toEqual([s1.id, s2.id].sort());
    expect(shipments.every((s) => s.status === "PAGO")).toBe(true);
  });

  it("assinatura forjada ou ausente é recusada e registrada", async () => {
    const { order } = await pendingOrder();
    const body = event(order.id);
    const ts = String(Math.floor(Date.now() / 1000));
    expect((await processPaymentWebhook(body, { timestamp: ts, signature: "0".repeat(64) }, ctx())).status).toBe(401);
    expect((await processPaymentWebhook(body, { timestamp: ts, signature: null }, ctx())).status).toBe(401);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
    expect(await db.auditLog.count({ where: { action: "WEBHOOK_REJECTED" } })).toBe(2);
  });

  it("corpo alterado depois de assinado é recusado", async () => {
    const { order } = await pendingOrder();
    const body = event(order.id, { amountCents: 1 });
    const sig = signed(body);
    const tampered = body.replace('"amountCents":1', '"amountCents":4500');
    expect((await processPaymentWebhook(tampered, sig, ctx())).status).toBe(401);
  });

  it("valor diferente do total do pedido é recusado", async () => {
    const { order } = await pendingOrder();
    const body = event(order.id, { amountCents: 1 });
    expect((await processPaymentWebhook(body, signed(body), ctx())).status).toBe(400);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
  });

  it("replay: o mesmo evento reenviado não é aplicado de novo", async () => {
    const { order } = await pendingOrder();
    const body = event(order.id);
    const sig = signed(body);
    expect((await processPaymentWebhook(body, sig, ctx())).status).toBe(200);
    expect((await processPaymentWebhook(body, sig, ctx())).status).toBe(409);
    expect(await db.shipment.count({ where: { orderId: order.id } })).toBe(2);
  });

  it("timestamp com mais de 5 minutos é recusado", async () => {
    const { order } = await pendingOrder();
    const body = event(order.id);
    expect((await processPaymentWebhook(body, signed(body, -6 * 60), ctx())).status).toBe(401);
    expect((await processPaymentWebhook(body, signed(body, 6 * 60), ctx())).status).toBe(401);
  });

  it("pagamento recusado cancela o pedido e devolve o estoque", async () => {
    const { order, p1 } = await pendingOrder();
    await db.product.update({ where: { id: p1.id }, data: { stock: 2 } }); // reservado no checkout
    const body = event(order.id, { status: "declined" });
    expect((await processPaymentWebhook(body, signed(body), ctx())).status).toBe(200);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELED");
    expect((await db.product.findUniqueOrThrow({ where: { id: p1.id } })).stock).toBe(3);
  });

  it("pedido já pago não volta a ser processado por outro evento", async () => {
    const { order } = await pendingOrder();
    const a = event(order.id);
    await processPaymentWebhook(a, signed(a), ctx());
    const b = event(order.id, { status: "declined" });
    expect((await processPaymentWebhook(b, signed(b), ctx())).status).toBe(400);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
  });
});

describe("vendedor (A01/A06)", () => {
  async function paid() {
    const data = await pendingOrder();
    const body = event(data.order.id);
    await processPaymentWebhook(body, signed(body), ctx());
    const shipment1 = await db.shipment.findFirstOrThrow({ where: { orderId: data.order.id, sellerId: data.s1.id } });
    return { ...data, shipment1 };
  }

  it("atualiza a própria entrega seguindo o fluxo; enviar exige rastreio", async () => {
    const { s1, shipment1 } = await paid();
    const up = (status: string, trackingCode = "") => updateShipmentStatus(s1.id, { shipmentId: shipment1.id, status, trackingCode }, ctx());
    expect((await up("ENTREGUE")).ok).toBe(false); // pular etapa
    expect((await up("SEPARANDO")).ok).toBe(true);
    expect((await up("ENVIADO")).ok).toBe(false); // sem rastreio
    expect((await up("ENVIADO", "BR123456789XX")).ok).toBe(true);
    expect((await up("SEPARANDO")).ok).toBe(false); // voltar
    expect((await up("ENTREGUE")).ok).toBe(true);
    expect(await db.auditLog.count({ where: { action: "SHIPMENT_UPDATED" } })).toBe(3);
  });

  it("vendedor não altera entrega de outro vendedor", async () => {
    const { s2, shipment1 } = await paid();
    const res = await updateShipmentStatus(s2.id, { shipmentId: shipment1.id, status: "SEPARANDO" }, ctx());
    expect(res).toEqual({ ok: false, error: "Entrega não encontrada." });
  });

  it("vendedor vê só as próprias vendas e só os próprios itens, sem CPF nem cartão", async () => {
    const { s1 } = await paid();
    const list = await listSellerShipments(s1.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.order.items.map((i) => i.productName)).toEqual(["P1"]);
    const json = JSON.stringify(list);
    expect(json).not.toMatch(/cpf|numberEnc|last4|4242/i);
  });

  it("vendedor não edita nem lê produto de outro vendedor", async () => {
    const { s2, p1 } = await pendingOrder();
    expect(await getSellerProduct(s2.id, p1.id)).toBeNull();
    const res = await updateProduct(s2.id, p1.id, { name: "Hackeado", description: "x", priceCents: 1, stock: 0 });
    expect(res.ok).toBe(false);
    expect((await db.product.findUniqueOrThrow({ where: { id: p1.id } })).name).toBe("P1");
  });

  it("produto com <script> no nome é aceito como texto e preço/estoque são validados", async () => {
    const { s1, p1 } = await pendingOrder();
    expect((await updateProduct(s1.id, p1.id, { name: "<script>alert(1)</script>", description: "d", priceCents: 100, stock: 1, active: "on" })).ok).toBe(true);
    expect((await updateProduct(s1.id, p1.id, { name: "x", description: "d", priceCents: -5, stock: 1 })).ok).toBe(false);
    expect((await updateProduct(s1.id, p1.id, { name: "x", description: "d", priceCents: 100, stock: -1 })).ok).toBe(false);
  });
});

describe("admin (A01/A09)", () => {
  it("desativar usuário derruba as sessões e impede login", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser();
    await login({ email: user.email, password: PASSWORD }, ctx());
    expect((await updateUser(admin.id, { userId: user.id, intent: "deactivate" }, ctx())).ok).toBe(true);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
    expect(await login({ email: user.email, password: PASSWORD }, ctx())).toEqual({ ok: false, error: LOGIN_ERROR });
    expect(await db.auditLog.count({ where: { action: "USER_UPDATED" } })).toBe(1);
  });

  it("admin não altera a própria conta", async () => {
    const admin = await createUser({ role: "ADMIN" });
    expect((await updateUser(admin.id, { userId: admin.id, intent: "role", role: "CUSTOMER" }, ctx())).ok).toBe(false);
  });

  it("listagem de usuários não traz CPF, telefone nem hash de senha", async () => {
    await createUser();
    const json = JSON.stringify(await listUsers());
    expect(json).not.toMatch(/cpf|phone|passwordHash|argon2/i);
  });
});
