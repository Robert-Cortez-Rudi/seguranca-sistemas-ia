import Link from "next/link";
import { redirect } from "next/navigation";
import { LockIcon } from "@/components/icons";
import { ProductImage } from "@/components/product-image";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { listAddresses, listCards } from "@/lib/services/account";
import { getCart, previewTotals } from "@/lib/services/cart";
import { CheckoutForm } from "./checkout-form";

// A06 — Resumo do pedido. O frete mostrado é prévia pelo primeiro endereço;
// o valor cobrado é recalculado no servidor com o endereço escolhido.
export default async function CheckoutPage() {
  const user = await requireUser(["CUSTOMER"]);
  const [cart, addresses, cards] = await Promise.all([getCart(user.id), listAddresses(user.id), listCards(user.id)]);
  if (cart.items.length === 0) redirect("/carrinho");

  const preview = previewTotals(cart.subtotalCents, addresses[0]?.uf);
  const missing = addresses.length === 0 || cards.length === 0;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
      <div>
        <Link href="/carrinho" className="link text-sm">← Voltar ao carrinho</Link>
        <h1 className="page-title mt-2">Finalizar compra</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-5">
          {missing ? (
            <p className="notice notice-warn">
              Cadastre um <Link href="/conta/enderecos" className="link">endereço</Link> e um{" "}
              <Link href="/conta/cartoes" className="link">cartão</Link> para continuar.
            </p>
          ) : (
            <CheckoutForm
              addresses={addresses.map((a) => ({ id: a.id, label: `${a.label} — ${a.street}, ${a.number} — ${a.city}/${a.uf}` }))}
              cards={cards.map((c) => ({ id: c.id, label: `${c.brand} ${c.label}` }))}
            />
          )}
        </div>

        <aside className="card overflow-hidden lg:sticky lg:top-32">
          <div className="card-header">
            <h2 className="section-title">Resumo do pedido</h2>
            <span className="text-sm text-muted">
              {cart.items.length} {cart.items.length === 1 ? "produto" : "produtos"}
            </span>
          </div>
          <ul className="divide-y divide-line px-5 text-sm">
            {cart.items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3 py-3">
                <div className="product-frame relative shrink-0 rounded-lg border border-line">
                  <ProductImage src={i.imageUrl} name={i.name} className="size-12 rounded-md text-lg" />
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-night px-1 text-[0.68rem] font-bold text-white">
                    {i.quantity}
                  </span>
                </div>
                <span className="min-w-0 flex-1 truncate">{i.name}</span>
                <span className="num font-medium">{formatMoney(i.lineCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="num">{formatMoney(cart.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Frete (prévia)</dt>
              <dd className="num">{formatMoney(preview.shippingCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="price text-2xl">{formatMoney(preview.totalCents)}</dd>
            </div>
          </dl>
          <p className="flex items-center gap-1.5 border-t border-line bg-subtle px-5 py-3 text-xs text-muted">
            <LockIcon className="size-3.5 shrink-0" /> O valor final é recalculado no servidor com o endereço escolhido.
          </p>
        </aside>
      </div>
    </main>
  );
}
