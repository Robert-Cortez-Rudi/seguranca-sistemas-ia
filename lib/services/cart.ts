import "server-only";
import { db } from "../db";
import { calcShippingCents } from "../shipping";
import { cartItemSchema, idSchema, MAX_ITEM_QUANTITY } from "../schemas";

// A06 — O carrinho guarda só produto e quantidade. Preço nunca é gravado nem lido do cliente:
// é sempre o preço atual do banco.

export const MAX_CART_LINES = 20;

type Result = { ok: true } | { ok: false; error: string };

export async function getCart(userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
    select: {
      items: {
        select: {
          quantity: true,
          product: { select: { id: true, name: true, priceCents: true, stock: true, active: true } },
        },
        orderBy: { productId: "asc" },
      },
    },
  });
  const items = (cart?.items ?? []).map((i) => ({
    productId: i.product.id,
    name: i.product.name,
    unitPriceCents: i.product.priceCents,
    quantity: i.quantity,
    available: i.product.active && i.product.stock >= i.quantity,
    lineCents: i.product.priceCents * i.quantity,
  }));
  const subtotalCents = items.reduce((s, i) => s + i.lineCents, 0);
  return { items, subtotalCents };
}

/** Prévia de frete e total para exibição. O checkout recalcula tudo de novo. */
export function previewTotals(subtotalCents: number, uf: string | undefined) {
  const shippingCents = uf ? calcShippingCents(uf, subtotalCents) : 0;
  return { shippingCents, totalCents: subtotalCents + shippingCents };
}

export async function addToCart(userId: string, input: unknown): Promise<Result> {
  const parsed = cartItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: `Quantidade deve ser de 1 a ${MAX_ITEM_QUANTITY}.` };
  const { productId, quantity } = parsed.data;

  const product = await db.product.findFirst({ where: { id: productId, active: true }, select: { stock: true } });
  if (!product) return { ok: false, error: "Produto indisponível." };

  const cart = await db.cart.upsert({ where: { userId }, create: { userId }, update: {}, select: { id: true } });
  const existing = await db.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
  const newQty = (existing?.quantity ?? 0) + quantity;

  if (newQty > MAX_ITEM_QUANTITY) return { ok: false, error: `Máximo de ${MAX_ITEM_QUANTITY} unidades por produto.` };
  if (newQty > product.stock) return { ok: false, error: "Estoque insuficiente." };
  if (!existing && (await db.cartItem.count({ where: { cartId: cart.id } })) >= MAX_CART_LINES) {
    return { ok: false, error: `O carrinho aceita até ${MAX_CART_LINES} produtos diferentes.` };
  }

  await db.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity: newQty },
    update: { quantity: newQty },
  });
  return { ok: true };
}

export async function setCartQuantity(userId: string, input: unknown): Promise<Result> {
  const parsed = cartItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: `Quantidade deve ser de 1 a ${MAX_ITEM_QUANTITY}.` };
  const product = await db.product.findFirst({ where: { id: parsed.data.productId, active: true }, select: { stock: true } });
  if (!product || parsed.data.quantity > product.stock) return { ok: false, error: "Estoque insuficiente." };
  // O filtro por cart.userId garante que só o próprio carrinho é alterado.
  const res = await db.cartItem.updateMany({
    where: { productId: parsed.data.productId, cart: { userId } },
    data: { quantity: parsed.data.quantity },
  });
  return res.count === 1 ? { ok: true } : { ok: false, error: "Item não encontrado." };
}

export async function removeFromCart(userId: string, productId: unknown): Promise<void> {
  const id = idSchema.safeParse(productId);
  if (!id.success) return;
  await db.cartItem.deleteMany({ where: { productId: id.data, cart: { userId } } });
}
