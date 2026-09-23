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

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Minha conta</h1>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-2 rounded-lg bg-white p-6 text-sm shadow-sm">
        <dt className="text-slate-500">Nome</dt>
        <dd>{row.name}</dd>
        <dt className="text-slate-500">E-mail</dt>
        <dd>{row.email}</dd>
        <dt className="text-slate-500">CPF</dt>
        <dd className="font-mono">{cpf}</dd>
        <dt className="text-slate-500">Telefone</dt>
        <dd className="font-mono">{phone}</dd>
        <dt className="text-slate-500">2FA</dt>
        <dd>{row.totpEnabled ? "Ativa" : "Desativada"}</dd>
      </dl>
      <nav className="flex flex-wrap gap-4 text-sm text-indigo-600">
        <Link href="/conta/seguranca">Segurança</Link>
        {user.role === "CUSTOMER" && (
          <>
            <Link href="/conta/pedidos">Meus pedidos</Link>
            <Link href="/conta/enderecos">Endereços</Link>
            <Link href="/conta/cartoes">Cartões</Link>
          </>
        )}
      </nav>
    </main>
  );
}
