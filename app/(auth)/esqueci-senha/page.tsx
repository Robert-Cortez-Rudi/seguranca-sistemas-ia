"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { forgotPasswordAction } from "../actions";

// A07 — Pedido de recuperação. Resposta sempre igual (anti-enumeração).
export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, undefined);
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-slate-600">Informe seu e-mail. O link vale por 15 minutos e só funciona uma vez.</p>
      <form action={action} className="space-y-4">
        <FormMessage error={state?.error} success={state?.success} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" required maxLength={254} />
        <SubmitButton>Enviar link</SubmitButton>
      </form>
    </main>
  );
}
