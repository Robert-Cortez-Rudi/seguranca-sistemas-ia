import { PinIcon, TruckIcon } from "@/components/icons";
import { ShipmentSteps } from "@/components/shipment-steps";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, SHIPMENT_STATUS_LABEL } from "@/lib/format";
import { nextShipmentStatus } from "@/lib/shipment";
import { listSellerShipments } from "@/lib/services/seller";
import { ShipmentForm } from "./shipment-form";

const STATUS_BADGE = { PAGO: "bg-sun", SEPARANDO: "bg-blue", ENVIADO: "bg-bubble", ENTREGUE: "bg-mint" } as const;

// A01/A06 — Vendas do vendedor: só as entregas dele, com o fluxo de status validado no servidor.
export default async function SalesPage() {
  const seller = await requireUser(["SELLER"]);
  const shipments = await listSellerShipments(seller.id);

  // Métricas calculadas sobre a mesma lista (nenhuma consulta extra).
  const toShip = shipments.filter((s) => s.status === "PAGO" || s.status === "SEPARANDO").length;
  const inTransit = shipments.filter((s) => s.status === "ENVIADO").length;
  const delivered = shipments.filter((s) => s.status === "ENTREGUE").length;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="page-title">Vendas e entregas</h1>
        <p className="mt-1 text-sm text-muted">Avance cada entrega na ordem: Pago → Separando → Enviado → Entregue.</p>
      </div>

      <section aria-label="Resumo" className="grid gap-4 sm:grid-cols-3">
        <div className="tile metric tint-blue">
          <span className="text-sm font-semibold text-muted">A enviar</span>
          <span className={`metric-value ${toShip > 0 ? "text-accent" : ""}`}>{toShip}</span>
          <span className="text-xs text-muted">pagas ou em separação</span>
        </div>
        <div className="tile metric tint-peach">
          <span className="text-sm font-semibold text-muted">Em trânsito</span>
          <span className="metric-value">{inTransit}</span>
          <span className="text-xs text-muted">com código de rastreio</span>
        </div>
        <div className="tile metric tint-mint">
          <span className="text-sm font-semibold text-muted">Entregues</span>
          <span className="metric-value">{delivered}</span>
          <span className="text-xs text-muted">entregas concluídas</span>
        </div>
      </section>

      {shipments.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <TruckIcon className="size-9 text-muted" />
          <p className="font-semibold">Nenhuma venda paga ainda</p>
          <p className="text-sm text-muted">As vendas aparecem aqui assim que o pagamento é confirmado.</p>
        </div>
      )}
      <ul className="space-y-4">
        {shipments.map((s) => {
          const next = nextShipmentStatus(s.status);
          return (
            <li key={s.id} className="card text-sm">
              <div className="card-header flex-wrap">
                <span>
                  <strong className="block">{s.order.user.name}</strong>
                  <span className="num text-xs text-muted">Pedido de {formatDate(s.order.createdAt)}</span>
                </span>
                <span className={`badge dot ${STATUS_BADGE[s.status]}`}>{SHIPMENT_STATUS_LABEL[s.status]}</span>
              </div>
              <div className="space-y-5 p-5">
                <ShipmentSteps status={s.status} />
                <div className="grid gap-4 md:grid-cols-2">
                  <ul className="space-y-1">
                    {s.order.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-3">
                        <span>
                          <strong className="num">{i.quantity} ×</strong> {i.productName}
                        </span>
                        <span className="num text-muted">{formatMoney(i.unitPriceCents)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="flex items-start gap-2 text-muted">
                    <PinIcon className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Entregar para: {s.address.recipient} — {s.address.street}, {s.address.number} {s.address.complement} — {s.address.city}/{s.order.shippingUf}
                    </span>
                  </p>
                </div>
                {s.trackingCode && <p className="badge bg-blue font-mono">Rastreio: {s.trackingCode}</p>}
                <div className="border-t border-line pt-4">
                  {next ? (
                    <ShipmentForm shipmentId={s.id} next={next} />
                  ) : (
                    <p role="status" className="notice notice-success">Entrega concluída.</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
