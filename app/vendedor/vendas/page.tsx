import Link from "next/link";
import { ShipmentSteps } from "@/components/shipment-steps";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { nextShipmentStatus } from "@/lib/shipment";
import { listSellerShipments } from "@/lib/services/seller";
import { ShipmentForm } from "./shipment-form";

// A01/A06 — Vendas do vendedor: só as entregas dele, com o fluxo de status validado no servidor.
export default async function SalesPage() {
  const seller = await requireUser(["SELLER"]);
  const shipments = await listSellerShipments(seller.id);
  return (
    <main className="mx-auto max-w-3xl space-y-7 px-4 py-10">
      <div className="space-y-3">
        <Link href="/vendedor" className="link text-sm">← Meus produtos</Link>
        <h1 className="page-title">Minhas vendas</h1>
      </div>
      {shipments.length === 0 && <p className="card p-6 text-muted">Nenhuma venda paga ainda.</p>}
      <ul className="space-y-5">
        {shipments.map((s) => {
          const next = nextShipmentStatus(s.status);
          return (
            <li key={s.id} className="card space-y-4 p-5 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className="font-display text-base font-semibold">{s.order.user.name}</strong>
                <span className="text-muted">Pedido de {formatDate(s.order.createdAt)}</span>
              </p>
              <ShipmentSteps status={s.status} />
              <ul className="space-y-0.5">
                {s.order.items.map((i, idx) => (
                  <li key={idx}>
                    <strong>{i.quantity} ×</strong> {i.productName} <span className="text-muted">({formatMoney(i.unitPriceCents)})</span>
                  </li>
                ))}
              </ul>
              <p className="text-muted">
                Entregar para: {s.address.recipient} — {s.address.street}, {s.address.number} {s.address.complement} — {s.address.city}/{s.order.shippingUf}
              </p>
              {s.trackingCode && <p className="badge bg-sun normal-case">Rastreio: {s.trackingCode}</p>}
              {next ? (
                <ShipmentForm shipmentId={s.id} next={next} />
              ) : (
                <p role="status" className="notice notice-success">Entrega concluída.</p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
