"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { CardIcon, PinIcon } from "@/components/icons";
import { checkoutAction } from "../actions";

type Option = { id: string; label: string };

function StepTitle({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="section-title mb-3 flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-full bg-night text-xs font-bold text-white">{n}</span>
      {icon}
      {children}
    </span>
  );
}

export function CheckoutForm({ addresses, cards }: { addresses: Option[]; cards: Option[] }) {
  const [state, action] = useActionState(checkoutAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <FormMessage error={state?.error} />
      <fieldset className="card space-y-2.5 p-5">
        <legend className="contents">
          <StepTitle n={1} icon={<PinIcon className="size-[1.1rem] text-muted" />}>Endereço de entrega</StepTitle>
        </legend>
        {addresses.map((a, i) => (
          <label key={a.id} className="choice">
            <input type="radio" name="addressId" value={a.id} defaultChecked={i === 0} required />
            {a.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="card space-y-2.5 p-5">
        <legend className="contents">
          <StepTitle n={2} icon={<CardIcon className="size-[1.1rem] text-muted" />}>Cartão</StepTitle>
        </legend>
        {cards.map((c, i) => (
          <label key={c.id} className="choice font-mono">
            <input type="radio" name="cardId" value={c.id} defaultChecked={i === 0} required />
            {c.label}
          </label>
        ))}
      </fieldset>
      <SubmitButton className="btn-deal btn-lg">Confirmar pedido</SubmitButton>
    </form>
  );
}
