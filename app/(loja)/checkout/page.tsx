import Link from "next/link";
import { redirect } from "next/navigation";
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
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Finalizar compra</h1>
      <ul className="rounded-lg bg-white p-4 text-sm shadow-sm">
        {cart.items.map((i) => (
          <li key={i.productId} className="flex justify-between py-1">
            <span>{i.quantity} × {i.name}</span>
            <span>{formatMoney(i.lineCents)}</span>
          </li>
        ))}
        <li className="mt-2 flex justify-between border-t pt-2">
          <span>Frete (prévia)</span>
          <span>{formatMoney(preview.shippingCents)}</span>
        </li>
        <li className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatMoney(preview.totalCents)}</span>
        </li>
      </ul>
      {missing ? (
        <p className="text-sm">
          Cadastre um <Link href="/conta/enderecos" className="text-indigo-600 underline">endereço</Link> e um{" "}
          <Link href="/conta/cartoes" className="text-indigo-600 underline">cartão</Link> para continuar.
        </p>
      ) : (
        <CheckoutForm
          addresses={addresses.map((a) => ({ id: a.id, label: `${a.label} — ${a.street}, ${a.number} — ${a.city}/${a.uf}` }))}
          cards={cards.map((c) => ({ id: c.id, label: `${c.brand} ${c.label}` }))}
        />
      )}
    </main>
  );
}
