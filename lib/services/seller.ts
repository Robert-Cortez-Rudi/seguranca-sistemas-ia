import "server-only";
import { z } from "zod";
import { audit } from "../audit";
import { decrypt } from "../crypto";
import { db } from "../db";
import type { RequestContext } from "../request";
import { idSchema, productSchema } from "../schemas";
import { canTransition } from "../shipment";
import type { FieldErrors } from "./auth";

// A01 — Vendedor só enxerga e altera o que é dele: todo where leva sellerId.

type Fail = { ok: false; error: string; fieldErrors?: FieldErrors };

export async function listSellerProducts(sellerId: string) {
  return db.product.findMany({
    where: { sellerId },
    select: { id: true, name: true, priceCents: true, stock: true, active: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSellerProduct(sellerId: string, productId: unknown) {
  const id = idSchema.safeParse(productId);
  if (!id.success) return null;
  return db.product.findFirst({
    where: { id: id.data, sellerId },
    select: { id: true, name: true, description: true, priceCents: true, stock: true, active: true },
  });
}

export async function createProduct(sellerId: string, input: unknown): Promise<{ ok: true; id: string } | Fail> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Corrija os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  const row = await db.product.create({ data: { ...parsed.data, sellerId }, select: { id: true } });
  return { ok: true, id: row.id };
}

const updateSchema = productSchema.extend({ active: z.enum(["on", "true"]).optional() });

export async function updateProduct(sellerId: string, productId: unknown, input: unknown): Promise<{ ok: true } | Fail> {
  const id = idSchema.safeParse(productId);
  const parsed = updateSchema.safeParse(input);
  if (!id.success) return { ok: false, error: "Produto não encontrado." };
  if (!parsed.success) return { ok: false, error: "Corrija os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  const { active, ...data } = parsed.data;
  // sellerId no where: produto de outro vendedor simplesmente não é encontrado.
  const res = await db.product.updateMany({ where: { id: id.data, sellerId }, data: { ...data, active: !!active } });
  return res.count === 1 ? { ok: true } : { ok: false, error: "Produto não encontrado." };
}

/** Vendas do vendedor: uma entrega por pedido, só com os itens dele. Sem CPF e sem cartão do cliente. */
export async function listSellerShipments(sellerId: string) {
  const rows = await db.shipment.findMany({
    where: { sellerId },
    select: {
      id: true,
      status: true,
      trackingCode: true,
      updatedAt: true,
      order: {
        select: {
          id: true,
          createdAt: true,
          shippingAddressEnc: true,
          shippingUf: true,
          user: { select: { name: true } },
          items: { where: { sellerId }, select: { productName: true, quantity: true, unitPriceCents: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  // O endereço é necessário para despachar; só vai para o vendedor da entrega.
  return rows.map(({ order: { shippingAddressEnc, ...order }, ...s }) => ({
    ...s,
    order,
    address: JSON.parse(decrypt(shippingAddressEnc, "order.address")) as Record<string, string>,
  }));
}

const shipmentUpdateSchema = z.object({
  shipmentId: idSchema,
  status: z.enum(["PAGO", "SEPARANDO", "ENVIADO", "ENTREGUE"]),
  trackingCode: z.string().trim().regex(/^[A-Z0-9]{8,20}$/i, "Código de rastreio inválido.").optional().or(z.literal("")),
});

export async function updateShipmentStatus(sellerId: string, input: unknown, ctx: RequestContext): Promise<{ ok: true } | Fail> {
  const parsed = shipmentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { shipmentId, status, trackingCode } = parsed.data;

  const shipment = await db.shipment.findFirst({ where: { id: shipmentId, sellerId }, select: { status: true } });
  if (!shipment) return { ok: false, error: "Entrega não encontrada." };
  if (!canTransition(shipment.status, status)) return { ok: false, error: "Mudança de status não permitida." };
  if (status === "ENVIADO" && !trackingCode) return { ok: false, error: "Informe o código de rastreio para marcar como enviado." };

  // Condicional no status atual: duas abas não aplicam a mesma transição duas vezes.
  const res = await db.shipment.updateMany({
    where: { id: shipmentId, sellerId, status: shipment.status },
    data: { status, ...(status === "ENVIADO" ? { trackingCode: trackingCode!.toUpperCase() } : {}) },
  });
  if (res.count !== 1) return { ok: false, error: "A entrega mudou enquanto você editava. Recarregue a página." };
  await audit("SHIPMENT_UPDATED", ctx, { userId: sellerId, metadata: { shipmentId, from: shipment.status, to: status } });
  return { ok: true };
}
