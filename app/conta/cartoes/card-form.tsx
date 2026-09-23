"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { addCardAction } from "../actions";

export function CardForm() {
  const [state, action] = useActionState(addCardAction, undefined);
  const fe = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormMessage error={state?.error} success={state?.success} />
      </div>
      <div className="sm:col-span-2">
        <Field label="Número do cartão" name="number" inputMode="numeric" autoComplete="cc-number" required maxLength={23} errors={fe?.number} />
      </div>
      <div className="sm:col-span-2">
        <Field label="Nome impresso" name="holder" autoComplete="cc-name" required maxLength={60} errors={fe?.holder} />
      </div>
      <Field label="Mês (MM)" name="expMonth" inputMode="numeric" autoComplete="cc-exp-month" required maxLength={2} errors={fe?.expMonth} />
      <Field label="Ano (AAAA)" name="expYear" inputMode="numeric" autoComplete="cc-exp-year" required maxLength={4} errors={fe?.expYear} />
      <Field label="CVV (não é armazenado)" name="cvv" type="password" inputMode="numeric" autoComplete="cc-csc" required maxLength={4} errors={fe?.cvv} />
      <div className="sm:col-span-2">
        <SubmitButton>Salvar cartão</SubmitButton>
      </div>
    </form>
  );
}
