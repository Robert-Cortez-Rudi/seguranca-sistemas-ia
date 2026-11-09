import Link from "next/link";
import { ChevronRightIcon, ReceiptIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "@/lib/format";
import { listOrdersForCustomer } from "@/lib/services/orders";

// A01 — Só os pedidos do próprio cliente.
export default async function OrdersPage() {
  const user = await requireUser(["CUSTOMER"]);
  const orders = await listOrdersForCustomer(user.id);
  return (
    <main className="space-y-6">
      <div>
        <h1 className="page-title">Meus pedidos</h1>
        <p className="mt-1 text-sm text-muted">Acompanhe o pagamento e a entrega de cada compra.</p>
      </div>

      {orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <ReceiptIcon className="size-9 text-muted" />
          <p className="section-title">Você ainda não fez pedidos</p>
          <p className="text-sm text-muted">Quando comprar algo, ele aparece aqui.</p>
          <Link href="/" className="btn btn-primary mt-2">Ver produtos</Link>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <div className="card-header">
            <h2 className="section-title">Histórico</h2>
            <span className="badge bg-paper">{orders.length} {orders.length === 1 ? "pedido" : "pedidos"}</span>
          </div>
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/conta/pedidos/${o.id}`} className="group flex flex-wrap items-center gap-4 px-5 py-4 text-sm hover:bg-subtle">
                  <span className="shrink-0 text-ink">
                    <ReceiptIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="num block font-semibold">Pedido de {formatDate(o.createdAt)}</span>
                    <span className="text-muted">{o._count.items} item(ns)</span>
                  </span>
                  <span className={`badge dot ${ORDER_STATUS_BADGE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                  <strong className="price w-28 text-right text-base">{formatMoney(o.totalCents)}</strong>
                  <span className="flex items-center gap-1 font-semibold text-accent">
                    <span className="hidden sm:inline">Ver detalhes</span>
                    <ChevronRightIcon className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
