"use server";

// A07 — Troca de senha e 2FA do usuário logado. Toda action confere a sessão de novo:
// Server Action é um endpoint público e não herda a proteção da página.
import { setSessionCookie, requireUser } from "@/lib/auth";
import { getRequestContext } from "@/lib/request";
import { formToObject } from "@/lib/schemas";
import { confirmEnrollment, disableMfa, startEnrollment } from "@/lib/services/mfa";
import { changePassword } from "@/lib/services/password";
import type { FormState } from "@/app/(auth)/actions";

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const result = await changePassword(user.id, formToObject(form), await getRequestContext());
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  // Sessões antigas caíram; este navegador recebe a sessão nova.
  await setSessionCookie(result.token, result.expiresAt);
  return { success: "Senha alterada. As outras sessões foram encerradas." };
}

export type MfaState =
  | { step: "idle"; error?: string; success?: string }
  | { step: "scan"; qrDataUrl: string; secret: string; error?: string }
  | { step: "codes"; recoveryCodes: string[] };

export async function mfaSetupAction(prev: MfaState, form: FormData): Promise<MfaState> {
  const user = await requireUser();
  const ctx = await getRequestContext();
  const intent = form.get("intent");

  if (intent === "start") {
    const res = await startEnrollment(user.id);
    return res.ok ? { step: "scan", qrDataUrl: res.qrDataUrl, secret: res.secret } : { step: "idle", error: res.error };
  }
  if (intent === "confirm") {
    const res = await confirmEnrollment(user.id, { code: form.get("code") }, ctx);
    if (res.ok) return { step: "codes", recoveryCodes: res.recoveryCodes };
    return prev.step === "scan" ? { ...prev, error: res.error } : { step: "idle", error: res.error };
  }
  if (intent === "disable") {
    const data = formToObject(form);
    const res = await disableMfa(user.id, { password: data.password, code: data.code }, ctx);
    return res.ok ? { step: "idle", success: "Verificação em duas etapas desativada." } : { step: "idle", error: res.error };
  }
  return { step: "idle" };
}
