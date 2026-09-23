import type { Role } from "@prisma/client";
import { blindIndex, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { RequestContext } from "@/lib/request";
import { generateCpf } from "@/lib/validators";

export const PASSWORD = "Senha-De-Teste-Forte-42";

let ipCounter = 0;
/** Cada teste usa um IP próprio para não esbarrar no rate limit de outro. */
export function ctx(ip?: string): RequestContext {
  return { ip: ip ?? `10.0.0.${++ipCounter}`, userAgent: "vitest" };
}

export async function createUser(opts: { email?: string; role?: Role; password?: string } = {}) {
  const cpf = generateCpf();
  return db.user.create({
    data: {
      email: opts.email ?? `u${Date.now()}${Math.random().toString(36).slice(2, 7)}@teste.local`,
      name: "Usuário Teste",
      role: opts.role ?? "CUSTOMER",
      passwordHash: await hashPassword(opts.password ?? PASSWORD),
      cpfEnc: encrypt(cpf, "user.cpf"),
      cpfHash: blindIndex(cpf),
    },
  });
}
