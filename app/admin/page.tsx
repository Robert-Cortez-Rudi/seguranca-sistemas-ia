import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listAuditLogs } from "@/lib/services/admin";

// A09 — AuditLog, visível só para ADMIN. Metadata já chega sem dados sensíveis (lib/audit.ts).
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["ADMIN"]);
  const sp = await searchParams;
  const { rows, total, page, pages, actions, action } = await listAuditLogs({
    action: typeof sp.acao === "string" ? sp.acao : undefined,
    page: Number(sp.pagina),
  });
  const qs = (p: number) => `/admin?${new URLSearchParams({ ...(action ? { acao: action } : {}), pagina: String(p) })}`;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <Link href="/admin/usuarios" className="text-sm text-indigo-600 hover:underline">Gerenciar usuários</Link>
      </div>
      <form className="flex items-center gap-2 text-sm">
        <label htmlFor="acao">Ação</label>
        <select id="acao" name="acao" defaultValue={action ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
          <option value="">Todas</option>
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="rounded-md bg-slate-200 px-3 py-1">Filtrar</button>
        <span className="ml-auto text-slate-500">{total} eventos</span>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] rounded-lg bg-white text-xs shadow-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="p-2">Data</th><th className="p-2">Ação</th><th className="p-2">Usuário</th><th className="p-2">IP</th><th className="p-2">Detalhes</th><th className="p-2">User agent</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="whitespace-nowrap p-2">{formatDate(r.createdAt)}</td>
                <td className="p-2 font-mono">{r.action}</td>
                <td className="p-2">{r.user?.email ?? "—"}</td>
                <td className="p-2 font-mono">{r.ip}</td>
                <td className="p-2 font-mono">{r.metadata ? JSON.stringify(r.metadata) : ""}</td>
                <td className="max-w-[16rem] truncate p-2 text-slate-500" title={r.userAgent ?? ""}>{r.userAgent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="flex justify-between text-sm">
        {page > 1 ? <Link href={qs(page - 1)} className="text-indigo-600">← Anterior</Link> : <span />}
        <span>Página {page} de {pages}</span>
        {page < pages ? <Link href={qs(page + 1)} className="text-indigo-600">Próxima →</Link> : <span />}
      </nav>
    </main>
  );
}
