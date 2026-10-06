"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { checkoutAction } from "../actions";

type Option = { id: string; label: string };

export function CheckoutForm({ addresses, cards }: { addresses: Option[]; cards: Option[] }) {
  const [state, action] = useActionState(checkoutAction, undefined);
  return (
    <form action={action} className="space-y-7">
      <FormMessage error={state?.error} />
      <fieldset className="space-y-2.5">
        <legend className="section-title mb-3">Endereço de entrega</legend>
        {addresses.map((a, i) => (
          <label key={a.id} className="choice">
            <input type="radio" name="addressId" value={a.id} defaultChecked={i === 0} required />
            {a.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="space-y-2.5">
        <legend className="section-title mb-3">Cartão</legend>
        {cards.map((c, i) => (
          <label key={c.id} className="choice font-mono">
            <input type="radio" name="cardId" value={c.id} defaultChecked={i === 0} required />
            {c.label}
          </label>
        ))}
      </fieldset>
      <SubmitButton className="btn-blue py-3 text-base">Confirmar pedido</SubmitButton>
    </form>
  );
}
