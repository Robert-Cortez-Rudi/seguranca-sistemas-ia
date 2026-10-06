"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { createProductAction, updateProductAction } from "./actions";

type Product = { id: string; name: string; description: string; priceCents: number; stock: number; active: boolean };

export function ProductForm({ product }: { product?: Product }) {
  const [state, action] = useActionState(product ? updateProductAction : createProductAction, undefined);
  const fe = state?.fieldErrors;
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} success={state?.success} />
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label="Nome" name="name" required maxLength={100} defaultValue={product?.name} errors={fe?.name} />
      <div className="space-y-1.5">
        <label htmlFor="f-description" className="label">Descrição</label>
        <textarea id="f-description" name="description" required maxLength={1000} rows={4} defaultValue={product?.description} className="input" />
        {fe?.description && <p className="field-error">{fe.description[0]}</p>}
      </div>
      <Field label="Preço em centavos (ex.: 19990 = R$ 199,90)" name="priceCents" type="number" min={1} max={10000000} required defaultValue={product?.priceCents} errors={fe?.priceCents} />
      <Field label="Estoque" name="stock" type="number" min={0} max={100000} required defaultValue={product?.stock} errors={fe?.stock} />
      {product && (
        <label className="choice w-fit">
          <input type="checkbox" name="active" defaultChecked={product.active} /> À venda
        </label>
      )}
      <SubmitButton>{product ? "Salvar" : "Cadastrar produto"}</SubmitButton>
    </form>
  );
}
