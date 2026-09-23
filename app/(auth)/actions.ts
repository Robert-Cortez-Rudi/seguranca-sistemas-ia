"use server";

// A07 — Login, cadastro e logout.
// CSRF (A01/A02): Server Actions só aceitam POST e o Next confere Origin contra Host;
// o cookie de sessão é SameSite=Lax.
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { clearSessionCookie, getCurrentSession, getSessionToken, safeRedirectPath, setSessionCookie } from "@/lib/auth";
import { getRequestContext } from "@/lib/request";
import { formToObject } from "@/lib/schemas";
import { login, register, type FieldErrors } from "@/lib/services/auth";
import { verifyMfaLogin } from "@/lib/services/mfa";
import { requestPasswordReset, resetPassword } from "@/lib/services/password";
import { deleteSessionByToken } from "@/lib/session";

export type FormState =
  | { error?: string; fieldErrors?: FieldErrors; success?: string; values?: Record<string, string> }
  | undefined;

// Devolve ao formulário o que foi digitado, para não perder tudo após um erro.
// Senhas, tokens e códigos nunca voltam.
function keepValues(data: Record<string, string>, fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, (data[f] ?? "").slice(0, 254)]));
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await getRequestContext();
  const data = formToObject(form);
  const result = await login({ email: data.email, password: data.password }, ctx);
  if (!result.ok) return { error: result.error, values: keepValues(data, ["email"]) };

  // Regeneração da sessão: a anterior (se houver) morre, evitando session fixation.
  await deleteSessionByToken(await getSessionToken());
  await setSessionCookie(result.token, result.expiresAt);

  const next = safeRedirectPath(data.next);
  if (result.mfaRequired) redirect(`/entrar/2fa?next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await getRequestContext();
  const data = formToObject(form);
  const result = await register(data, ctx);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors, values: keepValues(data, ["name", "email", "cpf", "phone"]) };
  }
  redirect("/entrar?cadastro=ok");
}

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await requestPasswordReset({ email: form.get("email") }, await getRequestContext());
  return result.ok ? { success: result.message } : { error: result.error };
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await resetPassword(formToObject(form), await getRequestContext());
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  // O reset derrubou todas as sessões; o cookie deste navegador também sai.
  await clearSessionCookie();
  redirect("/entrar?senha=ok");
}

export async function mfaAction(_prev: FormState, form: FormData): Promise<FormState> {
  const data = formToObject(form);
  const result = await verifyMfaLogin(await getSessionToken(), { code: data.code, kind: data.kind }, await getRequestContext());
  if (!result.ok) {
    if (result.restart) {
      await clearSessionCookie();
      redirect("/entrar");
    }
    return { error: result.error };
  }
  await setSessionCookie(result.token, result.expiresAt);
  redirect(safeRedirectPath(data.next));
}

export async function logoutAction(): Promise<void> {
  const ctx = await getRequestContext();
  const session = await getCurrentSession();
  await deleteSessionByToken(await getSessionToken());
  await clearSessionCookie();
  if (session) await audit("LOGOUT", ctx, { userId: session.user.id });
  redirect("/");
}
