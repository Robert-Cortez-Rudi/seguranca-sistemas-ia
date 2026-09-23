import "server-only";
import { decrypt } from "../crypto";
import { db } from "../db";
import { maskCard } from "../mask";
import { idSchema } from "../schemas";

// A01 — Leitura de pedidos sempre presa ao dono (cliente) ou ao vendedor do item.
// Pedido de outra pessoa devolve null, e a página responde 404.

export async function listOrdersForCustomer(userId: string) {
  return db.order.findMany({
    where: { userId },
    select: { id: true, status: true, totalCents: true, createdAt: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderForCustomer(userId: string, orderId: unknown) {
  const id = idSchema.safeParse(orderId);
  if (!id.success) return null;
  const order = await db.order.findFirst({
    where: { id: id.data, userId }, // o filtro por dono é o que impede o IDOR
    select: {
      id: true,
      status: true,
      subtotalCents: true,
      shippingCents: true,
      totalCents: true,
      createdAt: true,
      shippingAddressEnc: true,
      shippingUf: true,
      paymentCard: { select: { last4: true, brand: true } },
      items: { select: { productName: true, quantity: true, unitPriceCents: true } },
      shipments: { select: { status: true, trackingCode: true, seller: { select: { name: true } } } },
    },
  });
  if (!order) return null;
  const { shippingAddressEnc, paymentCard, ...rest } = order;
  return {
    ...rest,
    address: JSON.parse(decrypt(shippingAddressEnc, "order.address")) as Record<string, string>,
    card: `${paymentCard.brand} ${maskCard(paymentCard.last4)}`,
  };
}
