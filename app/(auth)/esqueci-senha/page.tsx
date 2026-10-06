"use client";

import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { forgotPasswordAction } from "../actions";

// A07 — Pedido de recuperação. Resposta sempre igual (anti-enumeração).
export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, undefined);
  return (
    <AuthShell title="Esqueci minha senha" subtitle="Informe seu e-mail. O link vale por 15 minutos e só funciona uma vez.">
      <form action={action} className="space-y-4">
        <FormMessage error={state?.error} success={state?.success} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" required maxLength={254} />
        <SubmitButton>Enviar link</SubmitButton>
      </form>
    </AuthShell>
  );
}
