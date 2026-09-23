import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, SHIPMENT_STATUS_LABEL } from "@/lib/format";
import { nextShipmentStatus } from "@/lib/shipment";
import { listSellerShipments } from "@/lib/services/seller";
import { ShipmentForm } from "./shipment-form";

// A01/A06 — Vendas do vendedor: só as entregas dele, com o fluxo de status validado no servidor.
export default async function SalesPage() {
  const seller = await requireUser(["SELLER"]);
  const shipments = await listSellerShipments(seller.id);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Minhas vendas</h1>
      {shipments.length === 0 && <p className="text-slate-500">Nenhuma venda paga ainda.</p>}
      <ul className="space-y-4">
        {shipments.map((s) => {
          const next = nextShipmentStatus(s.status);
          return (
            <li key={s.id} className="space-y-2 rounded-lg bg-white p-4 text-sm shadow-sm">
              <p className="flex justify-between">
                <span>Pedido de {formatDate(s.order.createdAt)} — {s.order.user.name}</span>
                <strong>{SHIPMENT_STATUS_LABEL[s.status]}</strong>
              </p>
              <ul className="text-slate-600">
                {s.order.items.map((i, idx) => (
                  <li key={idx}>{i.quantity} × {i.productName} ({formatMoney(i.unitPriceCents)})</li>
                ))}
              </ul>
              <p className="text-slate-600">
                Entregar para: {s.address.recipient} — {s.address.street}, {s.address.number} {s.address.complement} — {s.address.city}/{s.order.shippingUf}
              </p>
              {s.trackingCode && <p>Rastreio: {s.trackingCode}</p>}
              {next ? (
                <ShipmentForm shipmentId={s.id} next={next} />
              ) : (
                <p role="status" className="font-semibold text-emerald-700">Entrega concluída.</p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
