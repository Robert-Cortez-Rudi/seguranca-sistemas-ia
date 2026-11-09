"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { loginAction } from "../actions";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <FormMessage error={state?.error} success={state?.error ? undefined : notice} />
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" name="email" type="email" autoComplete="username" required maxLength={254} defaultValue={state?.values?.email} />
      <div className="space-y-1.5">
        <Field label="Senha" name="password" type="password" autoComplete="current-password" required maxLength={128} />
        <p className="text-right text-sm">
          <Link href="/esqueci-senha" className="link">
            Esqueci minha senha
          </Link>
        </p>
      </div>
      <SubmitButton>Entrar</SubmitButton>
      <div className="flex items-center gap-3 pt-2 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        Novo na SecureShop?
        <span className="h-px flex-1 bg-line" />
      </div>
      <Link href="/cadastro" className="btn btn-lg w-full">
        Criar conta
      </Link>
    </form>
  );
}
