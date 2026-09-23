import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { audit } from "../audit";
import { safeEqualHex } from "../crypto";
import { db } from "../db";
import type { RequestContext } from "../request";
import { idSchema } from "../schemas";

// A08 — Webhook do gateway de pagamento (simulado).
// Integridade: HMAC-SHA256 de "<timestamp>.<corpo bruto>" com PAYMENT_WEBHOOK_SECRET.
// Anti-replay: timestamp (segundos Unix) com no máximo 5 min de diferença + eventId de uso único.

export const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;
export const MAX_WEBHOOK_BODY = 4096;

const eventSchema = z.object({
  eventId: z.string().regex(/^evt_[A-Za-z0-9_-]{16,64}$/),
  orderId: idSchema,
  status: z.enum(["approved", "declined"]),
  amountCents: z.number().int().positive(),
});

function secret(): string {
  const s = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!s || s.length < 32) throw new Error("PAYMENT_WEBHOOK_SECRET ausente ou curto"); // fail closed
  return s;
}

export function signWebhook(timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret()).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

export type WebhookResult = { status: number; body: { ok: boolean; error?: string } };

const reject = async (ctx: RequestContext, reason: string, status = 400): Promise<WebhookResult> => {
  await audit("WEBHOOK_REJECTED", ctx, { metadata: { reason } });
  // Resposta genérica: quem forja a chamada não aprende por que falhou.
  return { status, body: { ok: false, error: "invalid" } };
};

export async function processPaymentWebhook(
  rawBody: string,
  headers: { signature: string | null; timestamp: string | null },
  ctx: RequestContext,
): Promise<WebhookResult> {
  if (rawBody.length > MAX_WEBHOOK_BODY) return reject(ctx, "body_too_large", 413);

  const ts = headers.timestamp ?? "";
  const sig = (headers.signature ?? "").toLowerCase();
  if (!/^\d{10}$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return reject(ctx, "missing_headers", 401);
  // Assinatura antes de qualquer outra coisa: nada do corpo é confiável até aqui.
  if (!safeEqualHex(sig, signWebhook(ts, rawBody))) return reject(ctx, "bad_signature", 401);
  if (Math.abs(Date.now() - Number(ts) * 1000) > WEBHOOK_TOLERANCE_MS) {
    return reject(ctx, "stale_timestamp", 401);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return reject(ctx, "bad_json");
  }
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) return reject(ctx, "bad_payload");
  const evt = parsed.data;

  const outcome = await db.$transaction(async (tx) => {
    // Registrar o eventId primeiro: se já existe, é replay (a PK recusa em paralelo também).
    const fresh = await tx.webhookEvent.createMany({ data: [{ id: evt.eventId, orderId: evt.orderId }], skipDuplicates: true });
    if (fresh.count === 0) return "replay" as const;

    const order = await tx.order.findUnique({
      where: { id: evt.orderId },
      select: { id: true, userId: true, status: true, totalCents: true, items: { select: { productId: true, sellerId: true, quantity: true } } },
    });
    if (!order) return "unknown_order" as const;
    if (order.totalCents !== evt.amountCents) return "amount_mismatch" as const;

    // Transição só a partir de PENDING_PAYMENT (condicional contra corrida).
    const next = evt.status === "approved" ? "PAID" : "CANCELED";
    const moved = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING_PAYMENT" },
      data: { status: next, paidAt: next === "PAID" ? new Date() : null },
    });
    if (moved.count !== 1) return "bad_transition" as const;

    if (next === "PAID") {
      const sellers = [...new Set(order.items.map((i) => i.sellerId))];
      await tx.shipment.createMany({ data: sellers.map((sellerId) => ({ orderId: order.id, sellerId, status: "PAGO" as const })) });
    } else {
      // Pagamento recusado devolve o estoque reservado no checkout.
      for (const i of order.items) {
        await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
      }
    }
    return { userId: order.userId, status: next };
  });

  if (typeof outcome === "string") {
    // Recusa: o pedido não mudou. Se o eventId era novo, ele fica registrado e não pode ser reenviado.
    return reject(ctx, outcome, outcome === "replay" ? 409 : 400);
  }

  await audit(outcome.status === "PAID" ? "ORDER_PAID" : "ORDER_CANCELED", ctx, {
    userId: outcome.userId,
    metadata: { orderId: evt.orderId, result: evt.status },
  });
  return { status: 200, body: { ok: true } };
}
