// A05 — Validadores de domínio usados pelos schemas Zod do servidor.

export const onlyDigits = (v: string) => v.replace(/\D/g, "");

/** CPF com os dois dígitos verificadores. Rejeita sequências repetidas (111.111.111-11). */
export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split("").map(Number);
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += digits[i]! * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === digits[9] && check(10) === digits[10];
}

/** Gera um CPF fictício válido (somente para seed e testes). */
export function generateCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (base.every((d) => d === base[0])) base[8] = (base[0]! + 1) % 10;
  const dv = (nums: number[]) => {
    const sum = nums.reduce((acc, d, i) => acc + d * (nums.length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  return [...base, d1, d2].join("");
}

export const isValidCep = (input: string) => /^\d{8}$/.test(onlyDigits(input)) && input.replace(/[\d-]/g, "") === "";

/** Algoritmo de Luhn para o número do cartão. */
export function isValidLuhn(input: string): boolean {
  const num = onlyDigits(input);
  if (num.length < 13 || num.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = Number(num[num.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function cardBrand(input: string): string {
  const n = onlyDigits(input);
  if (/^4/.test(n)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "MASTERCARD";
  if (/^3[47]/.test(n)) return "AMEX";
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return "ELO";
  return "OUTRA";
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
