"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form";
import { SHIPMENT_STATUS_LABEL } from "@/lib/format";
import { updateShipmentAction } from "../actions";

type Status = keyof typeof SHIPMENT_STATUS_LABEL;

export function ShipmentForm({ shipmentId, next }: { shipmentId: string; next: Status }) {
  const [state, action] = useActionState(updateShipmentAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <input type="hidden" name="status" value={next} />
      {next === "ENVIADO" && (
        <input name="trackingCode" placeholder="Código de rastreio" required pattern="[A-Za-z0-9]{8,20}" maxLength={20} aria-label="Código de rastreio" className="rounded-md border border-slate-300 px-2 py-1 text-sm" />
      )}
      <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">
        Marcar como {SHIPMENT_STATUS_LABEL[next]}
      </button>
      <FormMessage error={state?.error} success={state?.success} />
    </form>
  );
}
