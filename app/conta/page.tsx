import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { maskCpf, maskPhone } from "@/lib/mask";

// A01/A04 — Dados do próprio usuário, sempre mascarados. O select explícito
// traz só o necessário; o dado completo nunca sai do servidor.
export default async function AccountPage() {
  const user = await requireUser();
  const row = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { name: true, email: true, cpfEnc: true, phoneEnc: true, totpEnabled: true },
  });
  const cpf = row.cpfEnc ? maskCpf(decrypt(row.cpfEnc, "user.cpf")) : "—";
  const phone = row.phoneEnc ? maskPhone(decrypt(row.phoneEnc, "user.phone")) : "—";

  const links = [
    { href: "/conta/seguranca", label: "Segurança", hint: "Senha e 2FA", color: "bg-sun" },
    ...(user.role === "CUSTOMER"
      ? [
          { href: "/conta/pedidos", label: "Meus pedidos", hint: "Acompanhe as entregas", color: "bg-mint" },
          { href: "/conta/enderecos", label: "Endereços", hint: "Onde entregar", color: "bg-bubble" },
          { href: "/conta/cartoes", label: "Cartões", hint: "Formas de pagamento", color: "bg-coral" },
        ]
      : []),
  ];

  return (
    <main className="mx-auto max-w-2xl space-y-7 px-4 py-10">
      <h1 className="page-title">Minha conta</h1>
      <section className="card overflow-hidden">
        <div className="flex items-center gap-4 border-b-[2.5px] border-ink bg-cobalt p-5 text-white">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-sun font-display text-2xl font-extrabold text-ink" aria-hidden="true">
            {row.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-extrabold leading-tight">{row.name}</p>
            <p className="truncate text-sm opacity-90">{row.email}</p>
          </div>
        </div>
        <dl className="grid grid-cols-[7rem_1fr] gap-y-3 p-5 text-sm">
          <dt className="font-bold text-muted">CPF</dt>
          <dd className="font-mono">{cpf}</dd>
          <dt className="font-bold text-muted">Telefone</dt>
          <dd className="font-mono">{phone}</dd>
          <dt className="font-bold text-muted">2FA</dt>
          <dd>
            <span className={`badge ${row.totpEnabled ? "bg-mint" : "bg-paper"}`}>{row.totpEnabled ? "Ativa" : "Desativada"}</span>
          </dd>
        </dl>
      </section>
      <nav className="stagger grid gap-5 sm:grid-cols-2" aria-label="Seções da conta">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`card card-hover flex items-center justify-between gap-3 p-5 ${l.color}`}>
            <span>
              <span className="block font-display text-lg font-extrabold leading-tight">{l.label}</span>
              <span className="text-sm font-medium">{l.hint}</span>
            </span>
            <span className="arrow text-xl" aria-hidden="true">→</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
