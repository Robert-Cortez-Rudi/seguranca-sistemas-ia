"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { UFS } from "@/lib/validators";
import { createAddressAction } from "../actions";

export function AddressForm() {
  const [state, action] = useActionState(createAddressAction, undefined);
  const fe = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormMessage error={state?.error} success={state?.success} />
      </div>
      <Field label="Apelido (ex.: Casa)" name="label" required maxLength={40} errors={fe?.label} />
      <Field label="Destinatário" name="recipient" required maxLength={100} errors={fe?.recipient} />
      <Field label="CEP" name="cep" inputMode="numeric" placeholder="00000-000" required maxLength={9} errors={fe?.cep} />
      <Field label="Rua" name="street" required maxLength={120} errors={fe?.street} />
      <Field label="Número" name="number" required maxLength={10} errors={fe?.number} />
      <Field label="Complemento" name="complement" maxLength={60} errors={fe?.complement} />
      <Field label="Bairro" name="district" required maxLength={60} errors={fe?.district} />
      <Field label="Cidade" name="city" required maxLength={60} errors={fe?.city} />
      <div className="space-y-1.5">
        <label htmlFor="f-uf" className="label">UF</label>
        <select id="f-uf" name="uf" required className="input">
          {UFS.map((uf) => (
            <option key={uf}>{uf}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>Salvar endereço</SubmitButton>
      </div>
    </form>
  );
}
