"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { loginAction } from "../actions";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} success={state?.error ? undefined : notice} />
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" name="email" type="email" autoComplete="username" required maxLength={254} defaultValue={state?.values?.email} />
      <Field label="Senha" name="password" type="password" autoComplete="current-password" required maxLength={128} />
      <SubmitButton>Entrar</SubmitButton>
      <div className="flex flex-wrap justify-between gap-2 pt-1 text-sm">
        <Link href="/esqueci-senha" className="link">
          Esqueci minha senha
        </Link>
        <Link href="/cadastro" className="link">
          Criar conta
        </Link>
      </div>
    </form>
  );
}
