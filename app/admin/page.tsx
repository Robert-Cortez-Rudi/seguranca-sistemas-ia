import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listAuditLogs } from "@/lib/services/admin";

// Cor do selo conforme a gravidade do evento.
const actionBadge = (action: string) =>
  /FAIL|LOCKOUT|DENIED/.test(action) ? "bg-coral" : /OK|CREATED/.test(action) ? "bg-mint" : "bg-paper";

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
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title">Auditoria</h1>
        <Link href="/admin/usuarios" className="btn btn-sun">Gerenciar usuários</Link>
      </div>
      <form className="flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor="acao" className="label">Ação</label>
        <select id="acao" name="acao" defaultValue={action ?? ""} className="input w-auto py-1.5">
          <option value="">Todas</option>
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button className="btn btn-sm">Filtrar</button>
        <span className="badge ml-auto bg-cobalt text-white">{total} eventos</span>
      </form>
      <div className="table-wrap">
        <table className="table-pop min-w-[720px] text-xs">
          <thead>
            <tr><th>Data</th><th>Ação</th><th>Usuário</th><th>IP</th><th>Detalhes</th><th>User agent</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{formatDate(r.createdAt)}</td>
                <td><span className={`badge font-mono ${actionBadge(r.action)}`}>{r.action}</span></td>
                <td>{r.user?.email ?? "—"}</td>
                <td className="font-mono">{r.ip}</td>
                <td className="font-mono">{r.metadata ? JSON.stringify(r.metadata) : ""}</td>
                <td className="max-w-[16rem] truncate text-muted" title={r.userAgent ?? ""}>{r.userAgent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="flex items-center justify-between text-sm" aria-label="Paginação">
        {page > 1 ? <Link href={qs(page - 1)} className="btn btn-sm">← Anterior</Link> : <span />}
        <span className="font-bold">Página {page} de {pages}</span>
        {page < pages ? <Link href={qs(page + 1)} className="btn btn-sm">Próxima →</Link> : <span />}
      </nav>
    </main>
  );
}
