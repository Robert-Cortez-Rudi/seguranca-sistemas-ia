import "server-only";
import type { Role } from "@prisma/client";
import { generateToken, sha256 } from "./crypto";
import { db } from "./db";
import type { RequestContext } from "./request";

// Sessão: token aleatório de 32 bytes no cookie; no banco só o SHA-256 dele.
// Quem lê o banco não consegue montar um cookie válido.
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const MFA_PENDING_TTL_MS = 5 * 60 * 1000;

export type SessionUser = { id: string; email: string; name: string; role: Role; totpEnabled: boolean };
export type ValidSession = { sessionId: string; mfaPending: boolean; user: SessionUser };

export async function createSession(
  userId: string,
  ctx: RequestContext,
  opts: { mfaPending?: boolean } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + (opts.mfaPending ? MFA_PENDING_TTL_MS : SESSION_TTL_MS));
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      mfaPending: opts.mfaPending ?? false,
      expiresAt,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
  return { token, expiresAt };
}

/** Valida o token do cookie. Sessão expirada ou de usuário desativado é apagada e negada. */
export async function validateSessionToken(token: string | undefined): Promise<ValidSession | null> {
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      id: true,
      mfaPending: true,
      expiresAt: true,
      user: { select: { id: true, email: true, name: true, role: true, active: true, totpEnabled: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.active) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  const { id, email, name, role, totpEnabled } = session.user;
  return { sessionId: session.id, mfaPending: session.mfaPending, user: { id, email, name, role, totpEnabled } };
}

export async function deleteSessionByToken(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}
