import { beforeEach, describe, expect, it } from "vitest";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { calcShippingCents } from "@/lib/shipping";
import { addCard, createAddress } from "@/lib/services/account";
import { addToCart, getCart, removeFromCart, setCartQuantity } from "@/lib/services/cart";
import { checkout } from "@/lib/services/checkout";
import { resetDb } from "./helpers/db";
import { createUser, ctx } from "./helpers/factory";

beforeEach(resetDb);

async function setup(opts: { stock?: number; priceCents?: number } = {}) {
  const seller = await createUser({ role: "SELLER" });
  const product = await db.product.create({
    data: { sellerId: seller.id, name: "Fone", description: "d", priceCents: opts.priceCents ?? 10000, stock: opts.stock ?? 5 },
  });
  const customer = await createUser();
  const addr = await createAddress(customer.id, {
    label: "Casa", recipient: "Cliente", cep: "01310100", street: "Rua A", number: "1", district: "Centro", city: "São Paulo", uf: "SP",
  });
  const card = await addCard(customer.id, { number: "4242424242424242", holder: "Cliente", expMonth: "12", expYear: "2030", cvv: "123" });
  if (!addr.ok || !card.ok) throw new Error("setup falhou");
  return { seller, product, customer, addressId: addr.id, cardId: card.id };
}

describe("carrinho (A06)", () => {
  it("quantidade precisa ser de 1 a 10 e caber no estoque", async () => {
    const { customer, product } = await setup({ stock: 3 });
    for (const quantity of [0, -1, 11, 1.5, "abc"]) {
      expect((await addToCart(customer.id, { productId: product.id, quantity })).ok).toBe(false);
    }
    expect((await addToCart(customer.id, { productId: product.id, quantity: 4 })).ok).toBe(false);
    expect((await addToCart(customer.id, { productId: product.id, quantity: 3 })).ok).toBe(true);
    expect((await addToCart(customer.id, { productId: product.id, quantity: 1 })).ok).toBe(false); // somaria 4
  });

  it("preço enviado junto ao item é ignorado; o carrinho usa o preço do banco", async () => {
    const { customer, product } = await setup({ priceCents: 10000 });
    await addToCart(customer.id, { productId: product.id, quantity: 2, priceCents: 1, unitPriceCents: 1 });
    const cart = await getCart(customer.id);
    expect(cart.subtotalCents).toBe(20000);
  });

  it("cliente não altera nem remove item do carrinho de outro", async () => {
    const { customer, product } = await setup();
    const other = await createUser();
    await addToCart(customer.id, { productId: product.id, quantity: 1 });
    expect((await setCartQuantity(other.id, { productId: product.id, quantity: 5 })).ok).toBe(false);
    await removeFromCart(other.id, product.id);
    expect((await getCart(customer.id)).items[0]?.quantity).toBe(1);
  });

  it("produto inativo não entra no carrinho", async () => {
    const { customer, product } = await setup();
    await db.product.update({ where: { id: product.id }, data: { active: false } });
    expect((await addToCart(customer.id, { productId: product.id, quantity: 1 })).ok).toBe(false);
  });
});

describe("checkout (A06)", () => {
  it("preço adulterado no checkout é ignorado", async () => {
    const { customer, product, addressId, cardId } = await setup({ priceCents: 10000 });
    await addToCart(customer.id, { productId: product.id, quantity: 2 });

    const res = await checkout(
      customer.id,
      {
        addressId,
        cardId,
        // Tudo abaixo é o que um atacante mandaria editando a requisição:
        totalCents: 1,
        subtotalCents: 1,
        shippingCents: 0,
        items: [{ productId: product.id, quantity: 2, unitPriceCents: 1 }],
      },
      ctx(),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const order = await db.order.findUniqueOrThrow({ where: { id: res.orderId }, include: { items: true } });
    expect(order.subtotalCents).toBe(20000);
    expect(order.shippingCents).toBe(calcShippingCents("SP", 20000));
    expect(order.totalCents).toBe(20000 + order.shippingCents);
    expect(order.items[0]!.unitPriceCents).toBe(10000);
  });

  it("baixa o estoque, esvazia o carrinho, copia o endereço cifrado e registra ORDER_CREATED", async () => {
    const { customer, product, addressId, cardId } = await setup({ stock: 5 });
    await addToCart(customer.id, { productId: product.id, quantity: 2 });
    const res = await checkout(customer.id, { addressId, cardId }, ctx());
    if (!res.ok) throw new Error(res.error);

    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(3);
    expect((await getCart(customer.id)).items).toHaveLength(0);
    const order = await db.order.findUniqueOrThrow({ where: { id: res.orderId } });
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.shippingAddressEnc).not.toContain("Rua A");
    expect(JSON.parse(decrypt(order.shippingAddressEnc, "order.address")).street).toBe("Rua A");
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "ORDER_CREATED" } });
    expect(log.metadata).toMatchObject({ orderId: res.orderId });
  });

  it("estoque insuficiente desfaz o pedido inteiro", async () => {
    const { customer, product, addressId, cardId, seller } = await setup({ stock: 5 });
    const other = await db.product.create({ data: { sellerId: seller.id, name: "Outro", description: "d", priceCents: 500, stock: 5 } });
    await addToCart(customer.id, { productId: product.id, quantity: 2 });
    await addToCart(customer.id, { productId: other.id, quantity: 3 });
    await db.product.update({ where: { id: other.id }, data: { stock: 1 } }); // alguém comprou antes

    const res = await checkout(customer.id, { addressId, cardId }, ctx());
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/Estoque insuficiente/) });
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(5); // rollback
    expect(await db.order.count()).toBe(0);
    expect((await getCart(customer.id)).items).toHaveLength(2);
  });

  it("duas compras simultâneas da última unidade: só uma passa", async () => {
    const { product } = await setup({ stock: 1 });
    const buyers = await Promise.all(
      [1, 2].map(async () => {
        const c = await createUser();
        const addr = await createAddress(c.id, { label: "C", recipient: "R", cep: "01310100", street: "S", number: "1", district: "D", city: "C", uf: "RJ" });
        const card = await addCard(c.id, { number: "4242424242424242", holder: "H", expMonth: "12", expYear: "2030", cvv: "123" });
        if (!addr.ok || !card.ok) throw new Error();
        await addToCart(c.id, { productId: product.id, quantity: 1 });
        return { id: c.id, addressId: addr.id, cardId: card.id };
      }),
    );
    const results = await Promise.all(buyers.map((b) => checkout(b.id, { addressId: b.addressId, cardId: b.cardId }, ctx())));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(0);
  });

  it("duplo clique do mesmo cliente gera um único pedido", async () => {
    const { customer, product, addressId, cardId } = await setup({ stock: 5 });
    await addToCart(customer.id, { productId: product.id, quantity: 2 });
    const results = await Promise.all([1, 2, 3].map(() => checkout(customer.id, { addressId, cardId }, ctx())));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.order.count({ where: { userId: customer.id } })).toBe(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(3);
  });

  it("não usa endereço nem cartão de outro cliente", async () => {
    const { product, addressId, cardId } = await setup();
    const intruder = await createUser();
    await addToCart(intruder.id, { productId: product.id, quantity: 1 });
    expect(await checkout(intruder.id, { addressId, cardId }, ctx())).toEqual({ ok: false, error: "Endereço ou cartão inválido." });
  });

  it("carrinho vazio não gera pedido", async () => {
    const { customer, addressId, cardId } = await setup();
    expect(await checkout(customer.id, { addressId, cardId }, ctx())).toEqual({ ok: false, error: "Seu carrinho está vazio." });
  });
});

describe("frete", () => {
  it("por região e grátis a partir de R$ 500", () => {
    expect(calcShippingCents("SP", 1000)).toBe(1500);
    expect(calcShippingCents("RS", 1000)).toBe(2500);
    expect(calcShippingCents("AM", 1000)).toBe(3500);
    expect(calcShippingCents("AM", 50000)).toBe(0);
  });
});
