import type { ShipmentStatus } from "@prisma/client";

// A06 — Fluxo de entrega: PAGO → SEPARANDO → ENVIADO → ENTREGUE.
// Só o próximo passo é permitido: nada de pular etapa nem voltar.
const NEXT: Record<ShipmentStatus, ShipmentStatus | null> = {
  PAGO: "SEPARANDO",
  SEPARANDO: "ENVIADO",
  ENVIADO: "ENTREGUE",
  ENTREGUE: null,
};

export function nextShipmentStatus(current: ShipmentStatus): ShipmentStatus | null {
  return NEXT[current];
}

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return NEXT[from] === to;
}
