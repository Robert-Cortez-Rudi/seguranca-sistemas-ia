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
      <h1 className="page-title">Cartões</h1>
      <ul className="stagger grid gap-5 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.id} className="card flex aspect-[1.7] flex-col justify-between bg-cobalt p-5 text-white">
            <div className="flex items-start justify-between gap-2">
              <span className="font-display text-lg font-extrabold uppercase">{c.brand}</span>
              <span className="h-7 w-10 rounded-md border-[2.5px] border-ink bg-sun" aria-hidden="true" />
            </div>
            <span className="font-mono text-lg tracking-widest">{c.label}</span>
            <div className="flex items-end justify-between gap-2 text-sm">
              <span className="font-mono">
                {String(c.expMonth).padStart(2, "0")}/{c.expYear}
              </span>
              <form action={deleteCardAction}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="btn btn-sm">Remover</button>
              </form>
            </div>
          </li>
        ))}
        {cards.length === 0 && <li className="text-sm text-muted">Nenhum cartão cadastrado.</li>}
      </ul>
      <section className="card p-6">
        <h2 className="section-title mb-2">Novo cartão</h2>
        <p className="mb-5 text-xs font-semibold text-muted">Ambiente de teste: use 4242 4242 4242 4242.</p>
        <CardForm />
      </section>
    </main>
  );
}
