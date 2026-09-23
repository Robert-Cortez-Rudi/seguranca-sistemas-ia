// A07 — Hash de senha com Argon2id e política de senha.
import { hash, verify } from "@node-rs/argon2";
import { COMMON_PASSWORDS } from "./common-passwords";

// Valor de Algorithm.Argon2id (const enum que não pode ser importado com isolatedModules).
// O teste de cadastro confere o prefixo "$argon2id$" do hash gerado.
const ARGON2ID = 2;

const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456, // KiB (19 MiB), recomendação OWASP
  timeCost: 2,
  parallelism: 1,
} as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128; // limita o custo do hash contra DoS

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false; // hash corrompido nega o acesso
  }
}

// Hash válido de uma senha aleatória, usado quando o e-mail não existe:
// o login gasta o mesmo tempo nos dois casos e não revela quais contas existem.
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
}

/** Retorna a mensagem de erro, ou null se a senha atende à política. */
export function checkPasswordPolicy(password: string, context: { email?: string; name?: string } = {}): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return "Esta senha é muito comum. Escolha outra.";
  if (/^(.)\1+$/.test(password)) return "A senha não pode ser um único caractere repetido.";
  const localPart = context.email?.split("@")[0]?.toLowerCase();
  if (localPart && localPart.length >= 4 && lower.includes(localPart)) return "A senha não pode conter o seu e-mail.";
  return null;
}
