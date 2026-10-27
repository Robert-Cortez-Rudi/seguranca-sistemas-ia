import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProductImage } from "@/components/product-image";
import { formatMoney } from "@/lib/format";
import { MAX_ITEM_QUANTITY } from "@/lib/schemas";
import { getCart } from "@/lib/services/cart";
import { updateCartAction } from "../actions";

// A06 — Valores exibidos vêm do banco; o checkout recalcula tudo de novo.
export default async function CartPage() {
  const user = await requireUser(["CUSTOMER"]);
  const cart = await getCart(user.id);
  const allAvailable = cart.items.every((i) => i.available);

  return (
    <main className="mx-auto max-w-3xl space-y-7 px-4 py-10">
      <h1 className="page-title">Carrinho</h1>
      {cart.items.length === 0 ? (
        <div className="card space-y-4 p-8 text-center">
          <p className="font-display text-xl font-semibold">Seu carrinho está vazio.</p>
          <Link href="/" className="btn btn-primary">
            Ver produtos <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {cart.items.map((i) => (
              <li key={i.productId} className="card flex flex-wrap items-center gap-4 p-4 text-sm">
                <ProductImage src={i.imageUrl} name={i.name} className="h-16 w-20 shrink-0 rounded-md border border-line text-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold leading-tight">{i.name}</p>
                  <p className="text-muted">{formatMoney(i.unitPriceCents)} cada</p>
                  {!i.available && <p className="field-error">Indisponível na quantidade escolhida</p>}
                </div>
                <form action={updateCartAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="productId" value={i.productId} />
                  <label className="sr-only" htmlFor={`q-${i.productId}`}>Quantidade</label>
                  <input id={`q-${i.productId}`} name="quantity" type="number" min={1} max={MAX_ITEM_QUANTITY} defaultValue={i.quantity} className="input w-20 py-1.5" />
                  <button name="intent" value="update" className="btn btn-sm">Atualizar</button>
                  <button name="intent" value="remove" className="link link-danger cursor-pointer text-xs">Remover</button>
                </form>
                <p className="price w-full text-right text-xl sm:w-28">{formatMoney(i.lineCents)}</p>
              </li>
            ))}
          </ul>
          <div className="card flex flex-wrap items-center justify-between gap-4 bg-sun p-5">
            <p className="text-sm font-bold uppercase tracking-wide">
              Subtotal
              <span className="price block text-3xl normal-case">{formatMoney(cart.subtotalCents)}</span>
            </p>
            {allAvailable ? (
              <Link href="/checkout" className="btn btn-blue">
                Finalizar compra <span className="arrow" aria-hidden="true">→</span>
              </Link>
            ) : (
              <p className="field-error">Ajuste os itens indisponíveis para continuar.</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
