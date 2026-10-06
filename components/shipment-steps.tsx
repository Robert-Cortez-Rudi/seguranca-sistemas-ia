import { SHIPMENT_STATUS_LABEL } from "@/lib/format";

type Status = keyof typeof SHIPMENT_STATUS_LABEL;
const STEPS = Object.keys(SHIPMENT_STATUS_LABEL) as Status[];

// A06 — Só exibe o fluxo PAGO → SEPARANDO → ENVIADO → ENTREGUE; quem valida a transição é lib/shipment.ts.
export function ShipmentSteps({ status }: { status: Status }) {
  const current = STEPS.indexOf(status);
  return (
    <ol className="steps" aria-label="Etapas da entrega">
      {STEPS.map((s, i) => (
        <li key={s} className={i <= current ? "is-done" : undefined} aria-current={i === current ? "step" : undefined}>
          {SHIPMENT_STATUS_LABEL[s]}
        </li>
      ))}
    </ol>
  );
}
