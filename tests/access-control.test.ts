import { beforeEach, describe, expect, it } from "vitest";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { requiredRoles } from "@/lib/route-access";
import { addCard, createAddress, deleteAddress, deleteCard, listAddresses, listCards } from "@/lib/services/account";
import { getOrderForCustomer, listOrdersForCustomer } from "@/lib/services/orders";
import { resetDb } from "./helpers/db";
import { createUser } from "./helpers/factory";

beforeEach(resetDb);

const address = {
  label: "Casa",
  recipient: "Fulano",
  cep: "01310-100",
  street: "Rua X",
  number: "10",
  complement: "",
  district: "Centro",
  city: "São Paulo",
  uf: "SP",
};
const card = { number: "4242 4242 4242 4242", holder: "Fulano", expMonth: "12", expYear: "2030", cvv: "123" };

/** Pedido criado direto no banco (o checkout vem na fase 6). */
async function orderFor(userId: string) {
  const c = await db.paymentCard.create({
    data: { userId, numberEnc: encrypt("4242424242424242", "card.number"), holderEnc: encrypt("X", "card.holder"), last4: "4242", brand: "VISA", expMonth: 12, expYear: 2030 },
  });
  return db.order.create({
    data: {
      userId,
      subtotalCents: 1000,
      shippingCents: 500,
      totalCents: 1500,
      shippingUf: "SP",
      shippingAddressEnc: encrypt(JSON.stringify({ city: "São Paulo" }), "order.address"),
      paymentCardId: c.id,
    },
  });
}

describe("mapa de rotas do middleware (A01)", () => {
  it.each([
    ["/admin", ["ADMIN"]],
    ["/admin/usuarios", ["ADMIN"]],
    ["/ADMIN", ["ADMIN"]],
    ["//admin//", ["ADMIN"]],
    ["/%61dmin", ["ADMIN"]],
    ["/vendedor/produtos", ["SELLER"]],
    ["/conta/pedidos/abc", ["CUSTOMER", "SELLER", "ADMIN"]],
    ["/carrinho", ["CUSTOMER"]],
  ])("%s exige %j", (path, roles) => {
    expect(requiredRoles(path)).toEqual(roles);
  });

  it("rotas públicas não exigem login, e prefixo parecido não confunde", () => {
    expect(requiredRoles("/")).toBeNull();
    expect(requiredRoles("/produtos/x")).toBeNull();
    expect(requiredRoles("/administracao-publica")).toBeNull();
  });

  it("caminho mal codificado é tratado como protegido", () => {
    expect(requiredRoles("/%E0%A4%A")).toEqual(["ADMIN"]);
  });
});

describe("IDOR (A01)", () => {
  it("cliente A não acessa pedido do cliente B", async () => {
    const a = await createUser();
    const b = await createUser();
    const orderB = await orderFor(b.id);

    expect(await getOrderForCustomer(a.id, orderB.id)).toBeNull();
    expect((await listOrdersForCustomer(a.id)).map((o) => o.id)).not.toContain(orderB.id);
    // O dono vê normalmente
    expect((await getOrderForCustomer(b.id, orderB.id))?.id).toBe(orderB.id);
  });

  it("pedido de outro e pedido inexistente dão o mesmo resultado (sem enumeração)", async () => {
    const a = await createUser();
    const b = await createUser();
    const orderB = await orderFor(b.id);
    expect(await getOrderForCustomer(a.id, orderB.id)).toEqual(await getOrderForCustomer(a.id, "c".repeat(25)));
  });

  it("id malicioso não chega ao banco", async () => {
    const a = await createUser();
    expect(await getOrderForCustomer(a.id, "' OR 1=1--")).toBeNull();
    expect(await getOrderForCustomer(a.id, { not: "x" })).toBeNull();
  });

  it("cliente A não apaga nem lista endereço do cliente B", async () => {
    const a = await createUser();
    const b = await createUser();
    const created = await createAddress(b.id, address);
    if (!created.ok) throw new Error(created.error);

    expect(await listAddresses(a.id)).toEqual([]);
    expect(await deleteAddress(a.id, created.id)).toBe(false);
    expect(await db.address.count({ where: { id: created.id } })).toBe(1);
    expect(await deleteAddress(b.id, created.id)).toBe(true);
  });

  it("cliente A não apaga cartão do cliente B", async () => {
    const a = await createUser();
    const b = await createUser();
    const created = await addCard(b.id, card);
    if (!created.ok) throw new Error(created.error);
    expect(await deleteCard(a.id, created.id)).toBe(false);
    expect(await db.paymentCard.count({ where: { id: created.id } })).toBe(1);
  });
});

describe("dados sensíveis na conta (A04)", () => {
  it("endereço é gravado cifrado e só o dono o lê", async () => {
    const a = await createUser();
    await createAddress(a.id, address);
    const row = await db.address.findFirstOrThrow({ where: { userId: a.id } });
    expect(row.payloadEnc).not.toContain("Rua X");
    expect((await listAddresses(a.id))[0]).toMatchObject({ street: "Rua X", cep: "01310100", uf: "SP" });
  });

  it("cartão: número cifrado, CVV descartado, listagem só com os 4 últimos", async () => {
    const a = await createUser();
    const res = await addCard(a.id, card);
    expect(res.ok).toBe(true);
    const row = await db.paymentCard.findFirstOrThrow({ where: { userId: a.id } });
    expect(row.numberEnc).not.toContain("4242424242424242");
    expect(JSON.stringify(row)).not.toContain('"123"');
    expect(Object.keys(row)).not.toContain("cvv");
    const list = await listCards(a.id);
    expect(list).toEqual([{ id: row.id, label: "**** 4242", brand: "VISA", expMonth: 12, expYear: 2030 }]);
  });

  it("rejeita cartão com Luhn inválido e cartão vencido", async () => {
    const a = await createUser();
    expect((await addCard(a.id, { ...card, number: "4242 4242 4242 4241" })).ok).toBe(false);
    expect((await addCard(a.id, { ...card, expYear: String(new Date().getFullYear()), expMonth: "1" })).ok)
      .toBe(new Date().getMonth() === 0); // em janeiro o mês 1 ainda vale
  });

  it("rejeita CEP e UF inválidos", async () => {
    const a = await createUser();
    expect((await createAddress(a.id, { ...address, cep: "123" })).ok).toBe(false);
    expect((await createAddress(a.id, { ...address, uf: "XX" })).ok).toBe(false);
  });
});
