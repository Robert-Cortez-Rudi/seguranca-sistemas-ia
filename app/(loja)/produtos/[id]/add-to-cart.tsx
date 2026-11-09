"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { addToCartAction } from "../../actions";

export function AddToCart({ productId, max }: { productId: string; max: number }) {
  const [state, action] = useActionState(addToCartAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} success={state?.success} />
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-center gap-3">
        <label htmlFor="f-quantity" className="label">Quantidade</label>
        <input id="f-quantity" name="quantity" type="number" min={1} max={max} defaultValue={1} required className="input w-24" />
        <span className="text-xs text-muted">máx. {max}</span>
      </div>
      <SubmitButton className="btn-deal btn-lg">Adicionar ao carrinho</SubmitButton>
    </form>
  );
}
