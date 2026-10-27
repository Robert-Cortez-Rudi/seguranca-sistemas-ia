import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "@/lib/format";
import { listOrdersForCustomer } from "@/lib/services/orders";

// A01 — Só os pedidos do próprio cliente.
export default async function OrdersPage() {
  const user = await requireUser(["CUSTOMER"]);
  const orders = await listOrdersForCustomer(user.id);
  return (
    <main className="mx-auto max-w-2xl space-y-7 px-4 py-10">
      <h1 className="page-title">Meus pedidos</h1>
      <ul className="space-y-4">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/conta/pedidos/${o.id}`} className="card card-hover flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <span>
                <span className="block font-bold">{formatDate(o.createdAt)}</span>
                <span className="text-muted">{o._count.items} item(ns)</span>
              </span>
              <span className="flex items-center gap-3">
                <span className={`badge ${ORDER_STATUS_BADGE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span>
                <strong className="price text-lg">{formatMoney(o.totalCents)}</strong>
                <span className="arrow" aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
        {orders.length === 0 && (
          <li className="card space-y-4 p-8 text-center">
            <p className="font-display text-xl font-semibold">Você ainda não fez pedidos.</p>
            <Link href="/" className="btn btn-primary">Ver produtos</Link>
          </li>
        )}
      </ul>
    </main>
  );
}
