import "server-only";
import { Prisma } from "@prisma/client";
import { audit } from "../audit";
import { blindIndex, encrypt } from "../crypto";
import { db } from "../db";
import { checkPasswordPolicy, getDummyHash, hashPassword, verifyPassword } from "../password";
import { consumeRateLimit } from "../rate-limit";
import type { RequestContext } from "../request";
import { loginSchema, registerSchema } from "../schemas";
import { createSession } from "../session";

// Regras de login e cadastro, sem dependência de cookies: as Server Actions chamam
// estas funções e os testes também.

export const LOGIN_ERROR = "E-mail ou senha inválidos.";
export const RATE_LIMIT_ERROR = "Muitas tentativas a partir deste endereço. Tente novamente em alguns minutos.";
export const REGISTER_CONFLICT_ERROR =
  "Não foi possível concluir o cadastro com esses dados. Se você já tem conta, use \"Esqueci minha senha\".";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export type FieldErrors = Record<string, string[] | undefined>;
export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; mfaRequired: boolean }
  | { ok: false; error: string };

/** A07 — Primeira etapa do login (e-mail e senha). */
export async function login(input: unknown, ctx: RequestContext): Promise<LoginResult> {
  if (!(await consumeRateLimit(`login:ip:${ctx.ip}`))) {
    await audit("RATE_LIMITED", ctx, { metadata: { route: "login" } });
    return { ok: false, error: RATE_LIMIT_ERROR };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: LOGIN_ERROR };
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, active: true, lockedUntil: true, totpEnabled: true },
  });

  // E-mail inexistente: gasta o mesmo tempo de um Argon2 real e responde igual.
  if (!user) {
    await verifyPassword(await getDummyHash(), password);
    await audit("LOGIN_FAIL", ctx, { metadata: { reason: "unknown_email" } });
    return { ok: false, error: LOGIN_ERROR };
  }

  // Conta bloqueada: nem a senha correta entra. A mensagem continua genérica.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await verifyPassword(await getDummyHash(), password);
    await audit("LOGIN_FAIL", ctx, { userId: user.id, metadata: { reason: "locked" } });
    return { ok: false, error: LOGIN_ERROR };
  }

  const passwordOk = await verifyPassword(user.passwordHash, password);

  if (!passwordOk || !user.active) {
    await registerFailedLogin(user.id, ctx, user.active ? "bad_password" : "inactive");
    return { ok: false, error: LOGIN_ERROR };
  }

  if (user.totpEnabled) {
    // Sessão provisória: só serve para enviar o código TOTP (lib/services/mfa.ts).
    // O contador de falhas NÃO zera aqui: erros de código também levam ao bloqueio,
    // senão quem tem a senha repetiria "login + 5 chutes" indefinidamente.
    const session = await createSession(user.id, ctx, { mfaPending: true });
    return { ok: true, ...session, mfaRequired: true };
  }

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
  const session = await createSession(user.id, ctx);
  await audit("LOGIN_OK", ctx, { userId: user.id });
  return { ok: true, ...session, mfaRequired: false };
}

/**
 * Conta uma falha de autenticação (senha ou código 2FA) e bloqueia a conta na 5ª.
 * Incremento atômico no banco: tentativas paralelas não escapam da contagem.
 */
export async function registerFailedLogin(userId: string, ctx: RequestContext, reason: string): Promise<boolean> {
  const updated = await db.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  await audit("LOGIN_FAIL", ctx, { userId, metadata: { reason, attempt: updated.failedLoginCount } });
  if (updated.failedLoginCount < MAX_FAILED_LOGINS) return false;
  await db.user.update({
    where: { id: userId },
    data: { lockedUntil: new Date(Date.now() + LOCKOUT_MS), failedLoginCount: 0 },
  });
  await audit("LOCKOUT", ctx, { userId, metadata: { minutes: LOCKOUT_MS / 60000 } });
  return true;
}

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

/** A07 — Cadastro pelo formulário público: rate limit por IP antes da regra de cadastro. */
export async function register(input: unknown, ctx: RequestContext): Promise<RegisterResult> {
  if (!(await consumeRateLimit(`register:ip:${ctx.ip}`))) {
    await audit("RATE_LIMITED", ctx, { metadata: { route: "register" } });
    return { ok: false, error: RATE_LIMIT_ERROR };
  }
  return createCustomer(input, ctx);
}

/**
 * Regra de cadastro de cliente (validação, política de senha, cifragem, AuditLog), sem rate limit.
 * Só é chamada pelo register() acima e por scripts locais de operação (scripts/popular.ts),
 * que já têm acesso direto ao banco. O perfil é sempre CUSTOMER; a entrada não escolhe papel.
 */
export async function createCustomer(input: unknown, ctx: RequestContext): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Corrija os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  const policyError = checkPasswordPolicy(data.password, { email: data.email, name: data.name });
  if (policyError) return { ok: false, error: policyError, fieldErrors: { password: [policyError] } };

  const cpfHash = blindIndex(data.cpf);
  const passwordHash = await hashPassword(data.password);

  try {
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: "CUSTOMER",
        cpfEnc: encrypt(data.cpf, "user.cpf"),
        cpfHash,
        phoneEnc: encrypt(data.phone, "user.phone"),
      },
      select: { id: true },
    });
    await audit("REGISTER", ctx, { userId: user.id });
    return { ok: true, userId: user.id };
  } catch (err) {
    // E-mail ou CPF já cadastrado: mesma mensagem para os dois, sem dizer qual.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: REGISTER_CONFLICT_ERROR };
    }
    throw err;
  }
}
