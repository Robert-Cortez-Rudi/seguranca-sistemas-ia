import Link from "next/link";
import { CardIcon, ChevronRightIcon, KeyIcon, PinIcon, ReceiptIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { maskCpf, maskPhone } from "@/lib/mask";

const ROLE_LABEL = { CUSTOMER: "Cliente", SELLER: "Vendedor", ADMIN: "Administrador" } as const;

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
    { href: "/conta/seguranca", label: "Segurança", hint: "Senha e verificação em duas etapas", icon: KeyIcon },
    ...(user.role === "CUSTOMER"
      ? [
          { href: "/conta/pedidos", label: "Meus pedidos", hint: "Acompanhe pagamentos e entregas", icon: ReceiptIcon },
          { href: "/conta/enderecos", label: "Endereços", hint: "Onde entregar suas compras", icon: PinIcon },
          { href: "/conta/cartoes", label: "Cartões", hint: "Formas de pagamento salvas", icon: CardIcon },
        ]
      : []),
  ];

  return (
    <main className="space-y-6">
      <div>
        <h1 className="page-title">Meus dados</h1>
        <p className="mt-1 text-sm text-muted">Dados pessoais exibidos de forma mascarada. O valor completo nunca sai do servidor.</p>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 sm:p-6">
          <div className="min-w-0">
            <p className="truncate text-xl font-bold leading-tight">{row.name}</p>
            <p className="truncate text-sm text-muted">{row.email}</p>
          </div>
          <span className="badge bg-blue">{ROLE_LABEL[user.role]}</span>
        </div>
        <dl className="grid gap-px bg-line sm:grid-cols-3">
          <div className="bg-paper p-5">
            <dt className="text-sm text-muted">CPF</dt>
            <dd className="num mt-1.5 font-mono text-sm font-semibold">{cpf}</dd>
          </div>
          <div className="bg-paper p-5">
            <dt className="text-sm text-muted">Telefone</dt>
            <dd className="num mt-1.5 font-mono text-sm font-semibold">{phone}</dd>
          </div>
          <div className="bg-paper p-5">
            <dt className="text-sm text-muted">Verificação em duas etapas</dt>
            <dd className="mt-1.5">
              <span className={`badge dot ${row.totpEnabled ? "bg-mint" : "bg-sun"}`}>{row.totpEnabled ? "Ativa" : "Desativada"}</span>
            </dd>
          </div>
        </dl>
      </section>

      <nav aria-label="Seções da conta">
        <ul className="divide-y divide-line border-y border-line">
          {links.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="group flex items-center gap-4 px-1 py-4 hover:bg-subtle">
                <Icon className="size-6 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold group-hover:underline">{label}</span>
                  <span className="block text-sm text-muted">{hint}</span>
                </span>
                <ChevronRightIcon className="size-5" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
