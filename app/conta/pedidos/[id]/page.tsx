import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipmentSteps } from "@/components/shipment-steps";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "@/lib/format";
import { getOrderForCustomer } from "@/lib/services/orders";

// A01 — Pedido de outro cliente (ou inexistente) responde 404: sem IDOR e sem enumeração.
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["CUSTOMER"]);
  const order = await getOrderForCustomer(user.id, (await params).id);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-7 px-4 py-10">
      <div className="space-y-3">
        <Link href="/conta/pedidos" className="link text-sm">← Meus pedidos</Link>
        <h1 className="page-title">Pedido de {formatDate(order.createdAt)}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`badge ${ORDER_STATUS_BADGE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
          <span className="font-mono">{order.card}</span>
        </p>
      </div>
      <section className="card p-5 text-sm">
        <table className="w-full">
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx}>
                <td className="py-1.5">{i.productName}</td>
                <td className="py-1.5 text-right font-bold">{i.quantity} ×</td>
                <td className="py-1.5 text-right tabular-nums">{formatMoney(i.unitPriceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 grid grid-cols-2 gap-1 border-t border-line pt-3">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-right tabular-nums">{formatMoney(order.subtotalCents)}</dd>
          <dt className="text-muted">Frete ({order.shippingUf})</dt>
          <dd className="text-right tabular-nums">{formatMoney(order.shippingCents)}</dd>
          <dt className="self-end font-bold">Total</dt>
          <dd className="price text-right text-2xl">{formatMoney(order.totalCents)}</dd>
        </dl>
      </section>
      <section className="space-y-4">
        <h2 className="section-title">Entrega</h2>
        <p className="text-sm">
          {order.address.recipient} — {order.address.street}, {order.address.number} — {order.address.city}/{order.shippingUf}
        </p>
        <ul className="space-y-4">
          {order.shipments.map((s, idx) => (
            <li key={idx} className="card space-y-4 p-5 text-sm">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <strong>{s.seller.name}</strong>
                {s.trackingCode && <span className="badge bg-sun normal-case">rastreio {s.trackingCode}</span>}
              </p>
              <ShipmentSteps status={s.status} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
