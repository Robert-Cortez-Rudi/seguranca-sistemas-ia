// A04 — Exibição mascarada: a interface nunca mostra o dado completo.
import { onlyDigits } from "./validators";

/** 12345678909 → ***.456.789-** */
export function maskCpf(cpf: string): string {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return "***.***.***-**";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/** last4 "4242" → **** 4242 */
export const maskCard = (last4: string) => `**** ${last4}`;

/** 11987654321 → (11) *****-4321 */
export function maskPhone(phone: string): string {
  const d = onlyDigits(phone);
  return d.length >= 10 ? `(${d.slice(0, 2)}) *****-${d.slice(-4)}` : "*****";
}
