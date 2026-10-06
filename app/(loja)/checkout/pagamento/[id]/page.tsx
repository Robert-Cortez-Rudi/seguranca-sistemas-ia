import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getOrderForCustomer } from "@/lib/services/orders";
import { payAction } from "./actions";

// Tela do gateway SIMULADO. O botão pede ao servidor que o "gateway" assine e envie
// o webhook; o navegador não participa da assinatura (A08).
export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["CUSTOMER"]);
  const order = await getOrderForCustomer(user.id, (await params).id);
  if (!order) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/conta/pedidos/${order.id}`);

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-12">
      <h1 className="page-title">Pagamento</h1>
      <p className="notice notice-warn">
        Gateway simulado para fins acadêmicos. Nenhuma cobrança real é feita.
      </p>
      <div className="card space-y-5 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Total</p>
          <p className="price text-5xl">{formatMoney(order.totalCents)}</p>
          <p className="mt-2 font-mono text-sm">{order.card}</p>
        </div>
        <form action={payAction} className="flex flex-wrap gap-3">
          <input type="hidden" name="orderId" value={order.id} />
          <button name="result" value="approve" className="btn btn-mint flex-1">
            Aprovar pagamento
          </button>
          <button name="result" value="decline" className="btn flex-1">
            Recusar
          </button>
        </form>
      </div>
    </main>
  );
}
