"use client";

import { useActionState } from "react";
import { Field, FormMessage, PASSWORD_HINT, SubmitButton } from "@/components/form";
import { resetPasswordAction } from "../actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  const fe = state?.fieldErrors;
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha (mínimo 12 caracteres)" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} errors={fe?.password} hint={PASSWORD_HINT} />
      <Field label="Confirme a nova senha" name="confirmPassword" type="password" autoComplete="new-password" required maxLength={128} errors={fe?.confirmPassword} />
      <SubmitButton>Redefinir senha</SubmitButton>
    </form>
  );
}
