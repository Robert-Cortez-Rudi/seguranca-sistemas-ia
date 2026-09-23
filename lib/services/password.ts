import "server-only";
import { z } from "zod";
import { audit } from "../audit";
import { generateToken, sha256 } from "../crypto";
import { db } from "../db";
import { appUrl, sendMail } from "../mail";
import { checkPasswordPolicy, hashPassword, PASSWORD_MAX_LENGTH, verifyPassword } from "../password";
import { consumeRateLimit } from "../rate-limit";
import type { RequestContext } from "../request";
import { emailOnlySchema, resetPasswordSchema } from "../schemas";
import { createSession, deleteAllUserSessions } from "../session";
import { RATE_LIMIT_ERROR, type FieldErrors } from "./auth";

export const RESET_TTL_MS = 15 * 60 * 1000;
export const RESET_REQUEST_MESSAGE = "Se o e-mail existir, enviaremos um link para redefinir a senha.";
export const RESET_INVALID_ERROR = "Link inválido ou expirado. Peça um novo.";

type Result = { ok: true; message?: string } | { ok: false; error: string; fieldErrors?: FieldErrors };

/**
 * A07 — Pedido de recuperação. A resposta é sempre a mesma, exista o e-mail ou não.
 * O envio do e-mail não é aguardado, para que o tempo de resposta também não denuncie a conta.
 */
export async function requestPasswordReset(input: unknown, ctx: RequestContext): Promise<Result> {
  if (!(await consumeRateLimit(`reset:ip:${ctx.ip}`))) {
    await audit("RATE_LIMITED", ctx, { metadata: { route: "reset_request" } });
    return { ok: false, error: RATE_LIMIT_ERROR };
  }
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: true, message: RESET_REQUEST_MESSAGE };

  const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, active: true } });
  if (user?.active) {
    const token = generateToken(32);
    await db.$transaction([
      // Um link por vez: pedir de novo invalida os anteriores.
      db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
      }),
    ]);
    await audit("PASSWORD_RESET_REQUEST", ctx, { userId: user.id });
    const link = appUrl(`/redefinir-senha?token=${token}`);
    void sendMail(
      user.email,
      "Redefinição de senha — SecureShop",
      `Recebemos um pedido para redefinir sua senha.\n\nUse o link abaixo em até 15 minutos. Ele só funciona uma vez:\n${link}\n\nSe não foi você, ignore este e-mail. Sua senha continua a mesma.`,
    ).catch((err) => console.error("[mail] falha ao enviar reset", err));
  }
  return { ok: true, message: RESET_REQUEST_MESSAGE };
}

/** Confere o token sem consumi-lo (para a página mostrar o formulário ou o erro). */
export async function isResetTokenUsable(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  return !!row && !row.usedAt && row.expiresAt > new Date();
}

/**
 * A07 — Troca a senha pelo link. Token de uso único e validade de 15 min.
 * Depois: todas as sessões caem, o bloqueio por tentativas é zerado e o dono recebe aviso.
 */
export async function resetPassword(input: unknown, ctx: RequestContext): Promise<Result> {
  if (!(await consumeRateLimit(`reset:ip:${ctx.ip}`))) {
    await audit("RATE_LIMITED", ctx, { metadata: { route: "reset_confirm" } });
    return { ok: false, error: RATE_LIMIT_ERROR };
  }
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    if (fe.token) return { ok: false, error: RESET_INVALID_ERROR };
    return { ok: false, error: "Corrija os campos destacados.", fieldErrors: fe };
  }

  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: sha256(parsed.data.token) },
    select: { id: true, usedAt: true, expiresAt: true, user: { select: { id: true, email: true, name: true } } },
  });
  if (!row || row.usedAt || row.expiresAt <= new Date()) return { ok: false, error: RESET_INVALID_ERROR };

  const policyError = checkPasswordPolicy(parsed.data.password, { email: row.user.email, name: row.user.name });
  if (policyError) return { ok: false, error: policyError, fieldErrors: { password: [policyError] } };

  const passwordHash = await hashPassword(parsed.data.password);

  const consumed = await db.$transaction(async (tx) => {
    // Marca como usado só se ainda não foi: duas requisições simultâneas não usam o mesmo link.
    const claim = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claim.count !== 1) return false;
    await tx.user.update({
      where: { id: row.user.id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    });
    await tx.session.deleteMany({ where: { userId: row.user.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.user.id, id: { not: row.id } } });
    return true;
  });
  if (!consumed) return { ok: false, error: RESET_INVALID_ERROR };

  await audit("PASSWORD_RESET", ctx, { userId: row.user.id });
  void sendMail(
    row.user.email,
    "Sua senha foi alterada — SecureShop",
    `A senha da sua conta foi redefinida agora e todas as sessões abertas foram encerradas.\n\nSe não foi você, peça uma nova redefinição imediatamente em ${appUrl("/esqueci-senha")}.`,
  ).catch((err) => console.error("[mail] falha ao enviar aviso", err));
  return { ok: true };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    password: z.string().max(PASSWORD_MAX_LENGTH),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não conferem." });

/**
 * Troca de senha com a sessão aberta. Exige a senha atual; derruba todas as sessões
 * e devolve uma nova (regeneração), para o usuário continuar logado só neste navegador.
 */
export async function changePassword(
  userId: string,
  input: unknown,
  ctx: RequestContext,
): Promise<{ ok: true; token: string; expiresAt: Date } | { ok: false; error: string; fieldErrors?: FieldErrors }> {
  if (!(await consumeRateLimit(`change-password:user:${userId}`))) return { ok: false, error: RATE_LIMIT_ERROR };
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Corrija os campos destacados.", fieldErrors: parsed.error.flatten().fieldErrors };

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, name: true, passwordHash: true } });
  if (!(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return { ok: false, error: "Senha atual incorreta.", fieldErrors: { currentPassword: ["Senha atual incorreta."] } };
  }
  const policyError = checkPasswordPolicy(parsed.data.password, user);
  if (policyError) return { ok: false, error: policyError, fieldErrors: { password: [policyError] } };

  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await deleteAllUserSessions(userId);
  const session = await createSession(userId, ctx);
  await audit("PASSWORD_CHANGE", ctx, { userId });
  void sendMail(user.email, "Sua senha foi alterada — SecureShop", "A senha da sua conta foi alterada. Se não foi você, redefina-a imediatamente.")
    .catch((err) => console.error("[mail] falha ao enviar aviso", err));
  return { ok: true, ...session };
}
