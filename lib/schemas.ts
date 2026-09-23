// A05 — Schemas Zod de toda entrada recebida pelo servidor.
import { z } from "zod";
import { PASSWORD_MAX_LENGTH } from "./password";
import { isValidCep, isValidCpf, isValidLuhn, onlyDigits, UFS } from "./validators";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("E-mail inválido.");

// Texto livre: sem caracteres de controle. O React já escapa HTML na saída.
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Campo obrigatório.")
    .max(max, `Máximo de ${max} caracteres.`)
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "Caracteres inválidos.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const registerSchema = z
  .object({
    name: text(100),
    email,
    cpf: z.string().refine(isValidCpf, "CPF inválido.").transform(onlyDigits),
    phone: z
      .string()
      .transform(onlyDigits)
      .refine((v) => v.length === 10 || v.length === 11, "Telefone inválido."),
    password: z.string().max(PASSWORD_MAX_LENGTH, "Senha longa demais."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

export const emailOnlySchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Link inválido."),
    password: z.string().max(PASSWORD_MAX_LENGTH, "Senha longa demais."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

export const totpCodeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Código inválido.") });

export const recoveryCodeSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/, "Código inválido."),
});

export const addressSchema = z.object({
  label: text(40),
  recipient: text(100),
  cep: z.string().refine(isValidCep, "CEP inválido.").transform(onlyDigits),
  street: text(120),
  number: text(10),
  complement: z.string().trim().max(60).default(""),
  district: text(60),
  city: text(60),
  uf: z.enum(UFS, { message: "UF inválida." }),
});

export const cardSchema = z.object({
  number: z.string().refine(isValidLuhn, "Número de cartão inválido.").transform(onlyDigits),
  holder: text(60).transform((v) => v.toUpperCase()),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 20),
  // O CVV é validado e descartado: nunca é gravado.
  cvv: z.string().regex(/^\d{3,4}$/, "CVV inválido."),
}).refine(
  (c) => {
    const now = new Date();
    return c.expYear > now.getFullYear() || (c.expYear === now.getFullYear() && c.expMonth >= now.getMonth() + 1);
  },
  { path: ["expMonth"], message: "Cartão vencido." },
);

export const idSchema = z.string().regex(/^[a-z0-9]{20,32}$/, "ID inválido.");

export const MAX_ITEM_QUANTITY = 10;
export const cartItemSchema = z.object({
  productId: idSchema,
  quantity: z.coerce.number().int().min(1).max(MAX_ITEM_QUANTITY),
});

export const productSchema = z.object({
  name: text(100),
  description: text(1000),
  priceCents: z.coerce.number().int().min(1).max(10_000_000),
  stock: z.coerce.number().int().min(0).max(100_000),
});

/** Converte FormData em objeto simples (só strings; arquivos são ignorados). */
export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") out[k] = v;
  return out;
}
