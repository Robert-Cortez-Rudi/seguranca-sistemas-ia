"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form";
import { addToCartAction } from "../../actions";

export function AddToCart({ productId, max }: { productId: string; max: number }) {
  const [state, action] = useActionState(addToCartAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <FormMessage error={state?.error} success={state?.success} />
      <input type="hidden" name="productId" value={productId} />
      <label htmlFor="f-quantity" className="block text-sm font-medium">Quantidade</label>
      <input
        id="f-quantity"
        name="quantity"
        type="number"
        min={1}
        max={max}
        defaultValue={1}
        required
        className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <SubmitButton className="sm:w-auto">Adicionar ao carrinho</SubmitButton>
    </form>
  );
}
