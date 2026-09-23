"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { checkoutAction } from "../actions";

type Option = { id: string; label: string };

export function CheckoutForm({ addresses, cards }: { addresses: Option[]; cards: Option[] }) {
  const [state, action] = useActionState(checkoutAction, undefined);
  return (
    <form action={action} className="space-y-6">
      <FormMessage error={state?.error} />
      <fieldset className="space-y-2">
        <legend className="font-semibold">Endereço de entrega</legend>
        {addresses.map((a, i) => (
          <label key={a.id} className="flex items-center gap-2 text-sm">
            <input type="radio" name="addressId" value={a.id} defaultChecked={i === 0} required />
            {a.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="font-semibold">Cartão</legend>
        {cards.map((c, i) => (
          <label key={c.id} className="flex items-center gap-2 font-mono text-sm">
            <input type="radio" name="cardId" value={c.id} defaultChecked={i === 0} required />
            {c.label}
          </label>
        ))}
      </fieldset>
      <SubmitButton>Confirmar pedido</SubmitButton>
    </form>
  );
}
