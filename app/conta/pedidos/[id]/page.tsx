import Link from "next/link";
import { notFound } from "next/navigation";
import { CardIcon, PinIcon, TruckIcon } from "@/components/icons";
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
    <main className="space-y-6">
      <div>
        <Link href="/conta/pedidos" className="link text-sm">← Meus pedidos</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="page-title num">Pedido de {formatDate(order.createdAt)}</h1>
          </div>
          <span className={`badge dot ${ORDER_STATUS_BADGE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className="card">
            <div className="card-header">
              <h2 className="section-title flex items-center gap-2">
                <TruckIcon className="size-5 text-accent" /> Entrega
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <p className="flex items-start gap-2 text-sm">
                <PinIcon className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  <span className="font-semibold">{order.address.recipient}</span> — {order.address.street}, {order.address.number} —{" "}
                  {order.address.city}/{order.shippingUf}
                </span>
              </p>
              <ul className="space-y-4">
                {order.shipments.map((s, idx) => (
                  <li key={idx} className="space-y-5 rounded-lg border border-line p-4 text-sm">
                    <p className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="text-muted">Vendido por </span>
                        <strong>{s.seller.name}</strong>
                      </span>
                      {s.trackingCode && <span className="badge bg-blue font-mono">Rastreio {s.trackingCode}</span>}
                    </p>
                    <ShipmentSteps status={s.status} />
                  </li>
                ))}
                {order.shipments.length === 0 && (
                  <li className="notice notice-warn">A entrega começa depois que o pagamento for confirmado.</li>
                )}
              </ul>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="card-header">
              <h2 className="section-title">Itens</h2>
            </div>
            <table className="table-pop text-sm">
              <thead>
                <tr><th>Produto</th><th className="text-right">Qtd.</th><th className="text-right">Preço unitário</th></tr>
              </thead>
              <tbody>
                {order.items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{i.productName}</td>
                    <td className="num text-right">{i.quantity}</td>
                    <td className="num text-right">{formatMoney(i.unitPriceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="card h-fit p-5 text-sm lg:sticky lg:top-32">
          <h2 className="section-title">Resumo</h2>
          <dl className="mt-4 space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="num">{formatMoney(order.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Frete ({order.shippingUf})</dt>
              <dd className="num">{formatMoney(order.shippingCents)}</dd>
            </div>
            <div className="flex items-end justify-between border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="price text-2xl">{formatMoney(order.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-muted">
            <CardIcon className="size-4" />
            <span className="num font-mono text-ink">{order.card}</span>
          </p>
        </aside>
      </div>
    </main>
  );
}
