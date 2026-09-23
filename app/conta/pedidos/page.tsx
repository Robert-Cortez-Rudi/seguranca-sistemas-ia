import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_LABEL } from "@/lib/format";
import { listOrdersForCustomer } from "@/lib/services/orders";

// A01 — Só os pedidos do próprio cliente.
export default async function OrdersPage() {
  const user = await requireUser(["CUSTOMER"]);
  const orders = await listOrdersForCustomer(user.id);
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Meus pedidos</h1>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/conta/pedidos/${o.id}`} className="flex justify-between rounded-lg bg-white p-4 text-sm shadow-sm hover:bg-slate-50">
              <span>
                {formatDate(o.createdAt)} — {o._count.items} item(ns)
              </span>
              <span>
                {ORDER_STATUS_LABEL[o.status]} · <strong>{formatMoney(o.totalCents)}</strong>
              </span>
            </Link>
          </li>
        ))}
        {orders.length === 0 && <li className="text-sm text-slate-500">Você ainda não fez pedidos.</li>}
      </ul>
    </main>
  );
}
