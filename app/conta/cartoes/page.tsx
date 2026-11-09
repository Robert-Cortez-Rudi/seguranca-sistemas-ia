import { CardIcon, LockIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { listCards } from "@/lib/services/account";
import { deleteCardAction } from "../actions";
import { CardForm } from "./card-form";

// A04 — Cartões do cliente: a página só recebe bandeira, **** + 4 últimos e validade.
export default async function CardsPage() {
  const user = await requireUser(["CUSTOMER"]);
  const cards = await listCards(user.id);
  return (
    <main className="space-y-6">
      <div>
        <h1 className="page-title">Cartões</h1>
        <p className="mt-1 text-sm text-muted">Formas de pagamento salvas. Só a bandeira e os 4 últimos dígitos aparecem.</p>
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {cards.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 py-4">
            <CardIcon className="size-7 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{c.brand}</span>
              <span className="num block font-mono text-sm">{c.label}</span>
            </span>
            <span className="num text-sm text-muted">
              Validade {String(c.expMonth).padStart(2, "0")}/{c.expYear}
            </span>
            <form action={deleteCardAction}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="btn btn-danger btn-sm">Remover</button>
            </form>
          </li>
        ))}
        {cards.length === 0 && (
          <li className="flex flex-col items-center gap-2 py-10 text-center">
            <CardIcon className="size-8 text-muted" />
            <p className="font-semibold">Nenhum cartão cadastrado</p>
            <p className="text-sm text-muted">Adicione um cartão abaixo para finalizar suas compras.</p>
          </li>
        )}
      </ul>

      <section className="card">
        <div className="card-header">
          <h2 className="section-title">Novo cartão</h2>
          <span className="badge bg-sun">Teste: 4242 4242 4242 4242</span>
        </div>
        <div className="p-5 sm:p-6">
          <p className="notice notice-info mb-5 flex items-center gap-2">
            <LockIcon className="size-4 shrink-0" /> O número é cifrado (AES-256-GCM) e o CVV nunca é armazenado.
          </p>
          <CardForm />
        </div>
      </section>
    </main>
  );
}
