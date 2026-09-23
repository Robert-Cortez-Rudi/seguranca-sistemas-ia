import "server-only";
import type { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { audit } from "./audit";
import { getRequestContext } from "./request";
import { validateSessionToken, type SessionUser, type ValidSession } from "./session";

// Prefixo __Host-: o navegador só aceita o cookie com Secure, Path=/ e sem Domain,
// o que impede um subdomínio de sobrescrevê-lo.
export const SESSION_COOKIE = "__Host-ss_session";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript da página não lê o cookie (mitiga roubo via XSS)
    secure: true,
    sameSite: "lax", // não vai em POST vindo de outro site (CSRF)
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/", secure: true });
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Sessão da requisição atual (memorizada durante a renderização). */
export const getCurrentSession = cache(async (): Promise<ValidSession | null> => {
  return validateSessionToken(await getSessionToken());
});

/** Usuário logado com sessão completa (2FA concluído), ou null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getCurrentSession();
  return session && !session.mfaPending ? session.user : null;
}

/**
 * A01 — Exige login e, se informado, um dos perfis.
 * Perfil errado recebe 404, não 403: não confirma que a página existe.
 */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (roles && !roles.includes(user.role)) {
    await audit("ACCESS_DENIED", await getRequestContext(), { userId: user.id, metadata: { required: roles.join(",") } });
    notFound();
  }
  return user;
}

/** Evita open redirect: só aceita caminho interno ("/x"), nunca "//host" ou URL absoluta. */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}
