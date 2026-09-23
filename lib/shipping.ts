// A06 — Frete calculado só no servidor, a partir da UF do endereço salvo.
const REGION_CENTS: Record<string, number> = {
  SP: 1500,
  RJ: 2000, MG: 2000, ES: 2000,
  PR: 2500, SC: 2500, RS: 2500,
  DF: 3000, GO: 3000, MT: 3000, MS: 3000,
};
const DEFAULT_CENTS = 3500; // Norte e Nordeste
export const FREE_SHIPPING_FROM_CENTS = 50000;

export function calcShippingCents(uf: string, subtotalCents: number): number {
  if (subtotalCents >= FREE_SHIPPING_FROM_CENTS) return 0;
  return REGION_CENTS[uf] ?? DEFAULT_CENTS;
}
