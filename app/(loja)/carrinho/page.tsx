import Link from "next/link";
import { CartIcon, LockIcon } from "@/components/icons";
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
  const units = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
      <div>
        <h1 className="page-title">Carrinho</h1>
      </div>
      {cart.items.length === 0 ? (
        <div className="card mx-auto max-w-lg space-y-4 p-10 text-center">
          <span className="mx-auto inline-block text-ink">
            <CartIcon className="size-7" />
          </span>
          <p className="section-title">Seu carrinho está vazio.</p>
          <p className="text-sm text-muted">Explore o catálogo e adicione produtos para continuar.</p>
          <Link href="/" className="btn btn-primary">
            Ver produtos <span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <section className="card overflow-hidden">
            <div className="card-header">
              <h2 className="section-title">Itens</h2>
              <span className="text-sm text-muted">{units} {units === 1 ? "unidade" : "unidades"}</span>
            </div>
            <ul className="divide-y divide-line">
              {cart.items.map((i) => (
                <li key={i.productId} className="flex flex-wrap items-center gap-4 p-4 text-sm sm:p-5">
                  <div className="product-frame shrink-0 overflow-hidden rounded-lg border border-line">
                    <ProductImage src={i.imageUrl} name={i.name} className="size-20 text-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/produtos/${i.productId}`} className="font-semibold leading-snug hover:text-accent">{i.name}</Link>
                    <p className="mt-0.5 text-muted">{formatMoney(i.unitPriceCents)} cada</p>
                    {i.available ? (
                      <p className="mt-0.5 text-xs font-medium text-success">Em estoque</p>
                    ) : (
                      <p className="field-error mt-0.5">Indisponível na quantidade escolhida</p>
                    )}
                    <form action={updateCartAction} className="mt-3 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="productId" value={i.productId} />
                      <label className="sr-only" htmlFor={`q-${i.productId}`}>Quantidade</label>
                      <input id={`q-${i.productId}`} name="quantity" type="number" min={1} max={MAX_ITEM_QUANTITY} defaultValue={i.quantity} className="input w-20 py-1" />
                      <button name="intent" value="update" className="btn btn-sm">Atualizar</button>
                      <button name="intent" value="remove" className="btn btn-sm btn-ghost link-danger">Remover</button>
                    </form>
                  </div>
                  <p className="price ml-auto text-lg">{formatMoney(i.lineCents)}</p>
                </li>
              ))}
            </ul>
          </section>

          <aside className="card space-y-4 p-5 lg:sticky lg:top-32">
            <h2 className="section-title">Resumo do pedido</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal ({units} {units === 1 ? "item" : "itens"})</dt>
                <dd className="num font-semibold">{formatMoney(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Frete</dt>
                <dd className="text-muted">calculado no checkout</dd>
              </div>
            </dl>
            <div className="flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-semibold">Subtotal</span>
              <span className="price text-2xl">{formatMoney(cart.subtotalCents)}</span>
            </div>
            {allAvailable ? (
              <Link href="/checkout" className="btn btn-deal btn-lg w-full">
                Finalizar compra <span className="arrow" aria-hidden="true">→</span>
              </Link>
            ) : (
              <p className="notice notice-error">Ajuste os itens indisponíveis para continuar.</p>
            )}
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <LockIcon className="size-3.5" /> Preço e total conferidos no servidor
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
