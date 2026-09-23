import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_LABEL, SHIPMENT_STATUS_LABEL } from "@/lib/format";
import { getOrderForCustomer } from "@/lib/services/orders";

// A01 — Pedido de outro cliente (ou inexistente) responde 404: sem IDOR e sem enumeração.
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["CUSTOMER"]);
  const order = await getOrderForCustomer(user.id, (await params).id);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Pedido de {formatDate(order.createdAt)}</h1>
      <p className="text-sm">
        Situação: <strong>{ORDER_STATUS_LABEL[order.status]}</strong> · Pagamento: {order.card}
      </p>
      <table className="w-full rounded-lg bg-white text-sm shadow-sm">
        <tbody>
          {order.items.map((i, idx) => (
            <tr key={idx} className="border-b last:border-0">
              <td className="p-3">{i.productName}</td>
              <td className="p-3 text-right">{i.quantity} ×</td>
              <td className="p-3 text-right">{formatMoney(i.unitPriceCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="grid grid-cols-2 gap-1 text-sm">
        <dt>Subtotal</dt>
        <dd className="text-right">{formatMoney(order.subtotalCents)}</dd>
        <dt>Frete ({order.shippingUf})</dt>
        <dd className="text-right">{formatMoney(order.shippingCents)}</dd>
        <dt className="font-bold">Total</dt>
        <dd className="text-right font-bold">{formatMoney(order.totalCents)}</dd>
      </dl>
      <section>
        <h2 className="mb-2 font-semibold">Entrega</h2>
        <p className="text-sm">
          {order.address.recipient} — {order.address.street}, {order.address.number} — {order.address.city}/{order.shippingUf}
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {order.shipments.map((s, idx) => (
            <li key={idx}>
              {s.seller.name}: <strong>{SHIPMENT_STATUS_LABEL[s.status]}</strong>
              {s.trackingCode ? ` · rastreio ${s.trackingCode}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
