import { requireUser } from "@/lib/auth";
import { listCards } from "@/lib/services/account";
import { deleteCardAction } from "../actions";
import { CardForm } from "./card-form";

// A04 — Cartões do cliente: a página só recebe bandeira, **** + 4 últimos e validade.
export default async function CardsPage() {
  const user = await requireUser(["CUSTOMER"]);
  const cards = await listCards(user.id);
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <h1 className="text-2xl font-bold">Cartões</h1>
      <ul className="space-y-3">
        {cards.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-lg bg-white p-4 text-sm shadow-sm">
            <span className="font-mono">
              {c.brand} {c.label} — {String(c.expMonth).padStart(2, "0")}/{c.expYear}
            </span>
            <form action={deleteCardAction}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="text-red-600 hover:underline">Remover</button>
            </form>
          </li>
        ))}
        {cards.length === 0 && <li className="text-sm text-slate-500">Nenhum cartão cadastrado.</li>}
      </ul>
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Novo cartão</h2>
        <p className="mb-4 text-xs text-slate-500">Ambiente de teste: use 4242 4242 4242 4242.</p>
        <CardForm />
      </section>
    </main>
  );
}
