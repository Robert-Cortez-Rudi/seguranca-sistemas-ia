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
      <h1 className="text-2xl font-bold">Pagamento</h1>
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
        Gateway simulado para fins acadêmicos. Nenhuma cobrança real é feita.
      </p>
      <p>
        Total: <strong className="text-xl">{formatMoney(order.totalCents)}</strong> · {order.card}
      </p>
      <form action={payAction} className="flex gap-3">
        <input type="hidden" name="orderId" value={order.id} />
        <button name="result" value="approve" className="flex-1 rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
          Aprovar pagamento
        </button>
        <button name="result" value="decline" className="flex-1 rounded-md bg-slate-200 px-4 py-2 font-semibold hover:bg-slate-300">
          Recusar
        </button>
      </form>
    </main>
  );
}
