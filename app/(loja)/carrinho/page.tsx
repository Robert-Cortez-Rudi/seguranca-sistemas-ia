import Link from "next/link";
import { requireUser } from "@/lib/auth";
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
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Carrinho</h1>
      {cart.items.length === 0 ? (
        <p className="text-slate-500">
          Seu carrinho está vazio. <Link href="/" className="text-indigo-600 hover:underline">Ver produtos</Link>
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {cart.items.map((i) => (
              <li key={i.productId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 text-sm shadow-sm">
                <div>
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-slate-500">{formatMoney(i.unitPriceCents)} cada</p>
                  {!i.available && <p className="text-red-600">Indisponível na quantidade escolhida</p>}
                </div>
                <form action={updateCartAction} className="flex items-center gap-2">
                  <input type="hidden" name="productId" value={i.productId} />
                  <label className="sr-only" htmlFor={`q-${i.productId}`}>Quantidade</label>
                  <input id={`q-${i.productId}`} name="quantity" type="number" min={1} max={MAX_ITEM_QUANTITY} defaultValue={i.quantity} className="w-16 rounded-md border border-slate-300 px-2 py-1" />
                  <button name="intent" value="update" className="text-indigo-600 hover:underline">Atualizar</button>
                  <button name="intent" value="remove" className="text-red-600 hover:underline">Remover</button>
                </form>
                <p className="w-full text-right font-semibold sm:w-auto">{formatMoney(i.lineCents)}</p>
              </li>
            ))}
          </ul>
          <p className="text-right text-lg">
            Subtotal: <strong>{formatMoney(cart.subtotalCents)}</strong>
          </p>
          {allAvailable ? (
            <Link href="/checkout" className="block rounded-md bg-indigo-600 px-4 py-2 text-center font-semibold text-white hover:bg-indigo-700">
              Finalizar compra
            </Link>
          ) : (
            <p className="text-right text-sm text-red-600">Ajuste os itens indisponíveis para continuar.</p>
          )}
        </>
      )}
    </main>
  );
}
