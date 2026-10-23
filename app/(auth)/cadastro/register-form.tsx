"use client";

import { useActionState } from "react";
import { Field, FormMessage, PASSWORD_HINT, SubmitButton } from "@/components/form";
import { registerAction } from "../actions";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, undefined);
  const fe = state?.fieldErrors;
  const v = state?.values;
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <Field label="Nome completo" name="name" autoComplete="name" required maxLength={100} errors={fe?.name} defaultValue={v?.name} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required maxLength={254} errors={fe?.email} defaultValue={v?.email} />
      <Field label="CPF" name="cpf" inputMode="numeric" placeholder="000.000.000-00" required maxLength={14} errors={fe?.cpf} defaultValue={v?.cpf} />
      <Field label="Telefone" name="phone" type="tel" autoComplete="tel" placeholder="(11) 98765-4321" required maxLength={16} errors={fe?.phone} defaultValue={v?.phone} />
      <Field
        label="Senha (mínimo 12 caracteres)"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={128}
        errors={fe?.password}
        hint={PASSWORD_HINT}
      />
      <Field
        label="Confirme a senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        maxLength={128}
        errors={fe?.confirmPassword}
      />
      <SubmitButton>Criar conta</SubmitButton>
    </form>
  );
}
