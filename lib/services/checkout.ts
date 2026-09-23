import "server-only";
import { z } from "zod";
import { audit } from "../audit";
import { decrypt, encrypt } from "../crypto";
import { db } from "../db";
import type { RequestContext } from "../request";
import { idSchema, MAX_ITEM_QUANTITY } from "../schemas";
import { calcShippingCents } from "../shipping";

// A06 — Checkout. O cliente escolhe só QUAL endereço e QUAL cartão (ids dele).
// Itens vêm do carrinho no banco; preço, frete e total são calculados aqui.
// Qualquer outro campo enviado (preço, total, itens) é descartado pelo schema.
const checkoutSchema = z.object({ addressId: idSchema, cardId: idSchema }).strip();

class CheckoutError extends Error {}

export type CheckoutResult = { ok: true; orderId: string; totalCents: number } | { ok: false; error: string };

export async function checkout(userId: string, input: unknown, ctx: RequestContext): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Escolha um endereço e um cartão." };
  const { addressId, cardId } = parsed.data;

  // Endereço e cartão precisam ser do próprio usuário (A01).
  const [address, card] = await Promise.all([
    db.address.findFirst({ where: { id: addressId, userId }, select: { payloadEnc: true, uf: true } }),
    db.paymentCard.findFirst({ where: { id: cardId, userId }, select: { id: true, expMonth: true, expYear: true } }),
  ]);
  if (!address || !card) return { ok: false, error: "Endereço ou cartão inválido." };
  const now = new Date();
  if (card.expYear < now.getFullYear() || (card.expYear === now.getFullYear() && card.expMonth < now.getMonth() + 1)) {
    return { ok: false, error: "Cartão vencido." };
  }

  try {
    const order = await db.$transaction(async (tx) => {
      // Trava a linha do carrinho: um duplo clique vira duas transações em fila, e a
      // segunda encontra o carrinho já vazio em vez de gerar um pedido duplicado.
      const locked = await tx.cart.updateMany({ where: { userId }, data: { updatedAt: new Date() } });
      if (locked.count === 0) throw new CheckoutError("Seu carrinho está vazio.");
      const cart = await tx.cart.findUnique({
        where: { userId },
        select: {
          id: true,
          items: {
            select: {
              quantity: true,
              product: { select: { id: true, name: true, priceCents: true, sellerId: true } },
            },
          },
        },
      });
      if (!cart || cart.items.length === 0) throw new CheckoutError("Seu carrinho está vazio.");

      for (const item of cart.items) {
        if (item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY) throw new CheckoutError("Quantidade inválida no carrinho.");
        // Baixa condicional: só decrementa se ainda houver saldo. Duas compras simultâneas
        // da última unidade → uma delas não atualiza nada e a transação inteira é desfeita.
        const dec = await tx.product.updateMany({
          where: { id: item.product.id, active: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (dec.count !== 1) throw new CheckoutError(`Estoque insuficiente para "${item.product.name}".`);
      }

      const subtotalCents = cart.items.reduce((s, i) => s + i.product.priceCents * i.quantity, 0);
      const shippingCents = calcShippingCents(address.uf, subtotalCents);
      const addressCopy = decrypt(address.payloadEnc, "address.payload");

      const created = await tx.order.create({
        data: {
          userId,
          paymentCardId: card.id,
          subtotalCents,
          shippingCents,
          totalCents: subtotalCents + shippingCents,
          shippingUf: address.uf,
          shippingAddressEnc: encrypt(addressCopy, "order.address"),
          items: {
            create: cart.items.map((i) => ({
              productId: i.product.id,
              sellerId: i.product.sellerId,
              productName: i.product.name,
              quantity: i.quantity,
              unitPriceCents: i.product.priceCents, // preço do banco, não do cliente
            })),
          },
        },
        select: { id: true, totalCents: true },
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    await audit("ORDER_CREATED", ctx, { userId, metadata: { orderId: order.id, totalCents: order.totalCents } });
    return { ok: true, orderId: order.id, totalCents: order.totalCents };
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message };
    throw err;
  }
}
