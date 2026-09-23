import { NextResponse, type NextRequest } from "next/server";
import { getRequestContext } from "@/lib/request";
import { MAX_WEBHOOK_BODY, processPaymentWebhook } from "@/lib/services/payment";

// A08 — Webhook do gateway de pagamento. Chamada servidor-a-servidor: não tem cookie
// nem Origin de navegador, então a autenticidade vem da assinatura HMAC + timestamp +
// eventId único (lib/services/payment.ts), e não da checagem de Origin usada nas outras rotas.
export async function POST(request: NextRequest) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_WEBHOOK_BODY) return NextResponse.json({ ok: false, error: "invalid" }, { status: 413 });

  try {
    const raw = await request.text(); // corpo bruto: a assinatura é sobre os bytes exatos
    const result = await processPaymentWebhook(
      raw,
      { signature: request.headers.get("x-signature"), timestamp: request.headers.get("x-timestamp") },
      await getRequestContext(),
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    // A10 — detalhe só no log do servidor; a resposta é genérica.
    console.error("[webhook] erro", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
