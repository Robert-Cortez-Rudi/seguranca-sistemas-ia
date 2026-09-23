import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "../db";
import { appUrl } from "../mail";
import { idSchema } from "../schemas";
import { signWebhook } from "./payment";

// Gateway de pagamento SIMULADO. Faz o papel do provedor externo: monta o evento,
// assina com o segredo compartilhado e chama o webhook por HTTP, como faria um gateway real.
// O navegador nunca vê o segredo nem monta a assinatura.

export async function simulatePayment(userId: string, orderId: unknown, approve: boolean): Promise<boolean> {
  const id = idSchema.safeParse(orderId);
  if (!id.success) return false;
  // Só o dono do pedido pode "pagar" (A01), e só pedido aguardando pagamento.
  const order = await db.order.findFirst({
    where: { id: id.data, userId, status: "PENDING_PAYMENT" },
    select: { id: true, totalCents: true },
  });
  if (!order) return false;

  const body = JSON.stringify({
    eventId: `evt_${randomBytes(16).toString("base64url")}`,
    orderId: order.id,
    status: approve ? "approved" : "declined",
    amountCents: order.totalCents,
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const res = await fetch(appUrl("/api/webhooks/pagamento"), {
    method: "POST",
    headers: { "content-type": "application/json", "x-timestamp": timestamp, "x-signature": signWebhook(timestamp, body) },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  return res.ok;
}
