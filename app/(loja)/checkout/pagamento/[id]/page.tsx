import { notFound, redirect } from "next/navigation";
import { CardIcon, LockIcon } from "@/components/icons";
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
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-12">
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <h1 className="page-title">Pagamento</h1>
        </div>
        <div className="card overflow-hidden">
          <div className="space-y-1 p-6 text-center">
            <p className="text-sm font-medium text-muted">Total a pagar</p>
            <p className="price text-4xl sm:text-5xl">{formatMoney(order.totalCents)}</p>
            <p className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-subtle px-3 py-1 font-mono text-sm">
              <CardIcon className="size-4 text-muted" /> {order.card}
            </p>
          </div>
          <form action={payAction} className="space-y-2.5 border-t border-line bg-subtle p-5">
            <input type="hidden" name="orderId" value={order.id} />
            <button name="result" value="approve" className="btn btn-deal btn-lg w-full">
              Aprovar pagamento
            </button>
            <button name="result" value="decline" className="btn btn-danger w-full">
              Recusar
            </button>
          </form>
        </div>
        <p className="notice notice-warn">Gateway simulado para fins acadêmicos. Nenhuma cobrança real é feita.</p>
        <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted">
          <LockIcon className="mt-0.5 size-3.5 shrink-0" />
          O servidor assina o evento com HMAC e o envia ao webhook; o navegador não vê o segredo.
        </p>
      </div>
    </main>
  );
}
