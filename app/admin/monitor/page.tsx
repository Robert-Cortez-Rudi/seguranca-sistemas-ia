import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "@/lib/format";
import {
  getMonitorCounts,
  listMonitorOrders,
  listMonitorTransactions,
  listMonitorUsers,
  type MonitorTab,
  parseMonitorPage,
  parseMonitorTab,
  RECENT_WINDOW_MIN,
} from "@/lib/services/monitor";
import { RefreshControls } from "./refresh-controls";

// A01/A04/A09 — Monitor do sistema: quantidade e registros de usuários, pedidos e transações.
// Feito para acompanhar a aula enquanto o script `npm run simular` gera dados e a turma
// tenta quebrar o sistema. Só ADMIN entra (middleware + requireUser); dados sensíveis
// chegam mascarados do serviço e nada é editável aqui.

const ROLE_LABEL = { CUSTOMER: "Cliente", SELLER: "Vendedor", ADMIN: "Admin" } as const;
const ROLE_BADGE = { CUSTOMER: "bg-paper", SELLER: "bg-bubble", ADMIN: "bg-blue" } as const;
const TX_LABEL = { APPROVED: "Aprovada", DECLINED: "Recusada", REJECTED: "Rejeitada" } as const;
const TX_BADGE = { APPROVED: "bg-mint", DECLINED: "bg-coral", REJECTED: "bg-sun" } as const;
const REASON_LABEL: Record<string, string> = {
  amount_mismatch: "valor diferente do pedido",
  bad_transition: "pedido já não aguardava pagamento",
};

const TABS: { key: MonitorTab; label: string }[] = [
  { key: "usuarios", label: "Usuários" },
  { key: "pedidos", label: "Pedidos" },
  { key: "transacoes", label: "Transações" },
];

const plural = (n: number | undefined, one: string, many: string) => `${n ?? 0} ${(n ?? 0) === 1 ? one : many}`;
const shortId = (id: string) => `…${id.slice(-8)}`;
const time = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });
const href = (tab: MonitorTab, page = 1) => `/admin/monitor?${new URLSearchParams({ aba: tab, pagina: String(page) })}`;

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["ADMIN"]);
  const sp = await searchParams;
  const tab = parseMonitorTab(sp.aba);
  const page = parseMonitorPage(sp.pagina);

  const counts = await getMonitorCounts();
  const totals = { usuarios: counts.users.total, pedidos: counts.orders.total, transacoes: counts.transactions.total };

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Monitor do sistema</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Quantidade de usuários, pedidos e transações de pagamento, com os registros de cada um.
            Clique em <strong>Atualizar</strong> para ver os números mais recentes.
          </p>
        </div>
        <RefreshControls updatedAt={time(counts.generatedAt)} />
      </div>

      <p className="notice notice-info">
        <strong>Dica para a aula:</strong> ligue a atualização automática e rode <code className="font-mono">npm run simular</code> em
        outro terminal. Clique num total para ver os registros dele. As tentativas de ataque barradas aparecem em{" "}
        <Link href="/admin" className="link">Auditoria</Link>.
      </p>

      <section aria-label="Totais" className="grid gap-4 md:grid-cols-3">
        <MetricCard
          href={href("usuarios")}
          tint="tint-blue"
          active={tab === "usuarios"}
          label="Usuários"
          value={counts.users.total}
          recent={counts.users.recent}
        >
          <span className="badge bg-paper">{plural(counts.users.byRole.CUSTOMER, "cliente", "clientes")}</span>
          <span className="badge bg-bubble">{plural(counts.users.byRole.SELLER, "vendedor", "vendedores")}</span>
          <span className="badge bg-blue">{plural(counts.users.byRole.ADMIN, "admin", "admins")}</span>
        </MetricCard>
        <MetricCard
          href={href("pedidos")}
          tint="tint-peach"
          active={tab === "pedidos"}
          label="Pedidos"
          value={counts.orders.total}
          recent={counts.orders.recent}
        >
          <span className="badge dot bg-mint">{plural(counts.orders.byStatus.PAID, "pago", "pagos")}</span>
          <span className="badge dot bg-sun">{counts.orders.byStatus.PENDING_PAYMENT ?? 0} aguardando</span>
          <span className="badge dot bg-coral">{plural(counts.orders.byStatus.CANCELED, "cancelado", "cancelados")}</span>
        </MetricCard>
        <MetricCard
          href={href("transacoes")}
          tint="tint-mint"
          active={tab === "transacoes"}
          label="Transações"
          value={counts.transactions.total}
          recent={counts.transactions.recent}
          extra={`${formatMoney(counts.transactions.approvedCents)} aprovados`}
        >
          <span className="badge dot bg-mint">{plural(counts.transactions.byResult.APPROVED, "aprovada", "aprovadas")}</span>
          <span className="badge dot bg-coral">{plural(counts.transactions.byResult.DECLINED, "recusada", "recusadas")}</span>
          <span className="badge dot bg-sun">{plural(counts.transactions.byResult.REJECTED, "rejeitada", "rejeitadas")}</span>
        </MetricCard>
      </section>

      <section className="card overflow-hidden">
        <nav className="tabs px-3" aria-label="Registros">
          {TABS.map((t) => (
            <Link key={t.key} href={href(t.key)} aria-current={tab === t.key ? "page" : undefined}>
              {t.label}
              <span className="badge bg-paper num">{totals[t.key]}</span>
            </Link>
          ))}
        </nav>
        {tab === "usuarios" && <UsersTable page={page} />}
        {tab === "pedidos" && <OrdersTable page={page} />}
        {tab === "transacoes" && <TransactionsTable page={page} />}
      </section>
    </main>
  );
}

function MetricCard({
  href: to,
  tint,
  active,
  label,
  value,
  recent,
  extra,
  children,
}: {
  href: string;
  tint: string;
  active: boolean;
  label: string;
  value: number;
  recent: number;
  extra?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={to}
      aria-current={active ? "page" : undefined}
      className={`tile metric ${tint} ${active ? "ring-2 ring-accent" : ""}`}
    >
      <span className="flex items-center justify-between gap-2 text-sm font-bold">
        {label}
        <span className="text-xs font-semibold text-accent-strong">{active ? "Exibindo abaixo" : "Ver registros →"}</span>
      </span>
      <span className="metric-value">{value.toLocaleString("pt-BR")}</span>
      <span className="text-xs text-muted">
        <span className={recent > 0 ? "font-semibold text-success" : ""}>+{recent.toLocaleString("pt-BR")}</span> nos
        últimos {RECENT_WINDOW_MIN} min{extra ? ` · ${extra}` : ""}
      </span>
      <span className="mt-2 flex flex-wrap gap-1.5">{children}</span>
    </Link>
  );
}

function Pagination({ tab, page, pages, total }: { tab: MonitorTab; page: number; pages: number; total: number }) {
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm" aria-label="Paginação">
      <span className="text-muted">
        {total.toLocaleString("pt-BR")} {total === 1 ? "registro" : "registros"} · página {Math.min(page, pages)} de {pages}
      </span>
      <span className="flex gap-2">
        {page > 1 ? <Link href={href(tab, page - 1)} className="btn btn-sm">← Anterior</Link> : null}
        {page < pages ? <Link href={href(tab, page + 1)} className="btn btn-sm">Próxima →</Link> : null}
      </span>
    </nav>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={99} className="py-10 text-center text-sm text-muted">{text}</td>
    </tr>
  );
}

async function UsersTable({ page }: { page: number }) {
  const { rows, total, pages } = await listMonitorUsers(page);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="table-pop min-w-[900px] text-sm">
          <thead>
            <tr><th>Criado em</th><th>Nome</th><th>E-mail</th><th>Perfil</th><th>CPF</th><th>Telefone</th><th className="text-right">Pedidos</th><th>Situação</th><th>ID</th></tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="num whitespace-nowrap text-muted">{formatDate(u.createdAt)}</td>
                <td className="whitespace-nowrap font-semibold">{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABEL[u.role]}{u.totpEnabled ? " · 2FA" : ""}</span>
                </td>
                <td className="num whitespace-nowrap font-mono text-xs">{u.cpf}</td>
                <td className="num whitespace-nowrap font-mono text-xs">{u.phone}</td>
                <td className="num text-right">{u.orders}</td>
                <td>
                  <span className={`badge dot ${!u.active ? "bg-coral" : u.locked ? "bg-sun" : "bg-mint"}`}>
                    {!u.active ? "Desativado" : u.locked ? "Bloqueado" : "Ativo"}
                  </span>
                </td>
                <td className="whitespace-nowrap font-mono text-xs text-muted" title={u.id}>{shortId(u.id)}</td>
              </tr>
            ))}
            {rows.length === 0 && <Empty text="Nenhum usuário nesta página." />}
          </tbody>
        </table>
      </div>
      <Pagination tab="usuarios" page={page} pages={pages} total={total} />
    </>
  );
}

async function OrdersTable({ page }: { page: number }) {
  const { rows, total, pages } = await listMonitorOrders(page);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="table-pop min-w-[960px] text-sm">
          <thead>
            <tr><th>Criado em</th><th>Pedido</th><th>Cliente</th><th className="text-right">Itens</th><th className="text-right">Subtotal</th><th className="text-right">Frete</th><th className="text-right">Total</th><th>UF</th><th>Cartão</th><th>Status</th><th>Pago em</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="num whitespace-nowrap text-muted">{formatDate(o.createdAt)}</td>
                <td className="whitespace-nowrap font-mono text-xs" title={o.id}>{shortId(o.id)}</td>
                <td>
                  <span className="block font-semibold">{o.user.name}</span>
                  <span className="block text-xs text-muted">{o.user.email}</span>
                </td>
                <td className="num text-right">{o.items}</td>
                <td className="num text-right">{formatMoney(o.subtotalCents)}</td>
                <td className="num text-right">{formatMoney(o.shippingCents)}</td>
                <td className="num text-right font-semibold">{formatMoney(o.totalCents)}</td>
                <td>{o.shippingUf}</td>
                <td className="num whitespace-nowrap font-mono text-xs">{o.card}</td>
                <td><span className={`badge dot ${ORDER_STATUS_BADGE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                <td className="num whitespace-nowrap text-muted">{o.paidAt ? formatDate(o.paidAt) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <Empty text="Nenhum pedido nesta página." />}
          </tbody>
        </table>
      </div>
      <Pagination tab="pedidos" page={page} pages={pages} total={total} />
    </>
  );
}

async function TransactionsTable({ page }: { page: number }) {
  const { rows, total, pages } = await listMonitorTransactions(page);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="table-pop min-w-[900px] text-sm">
          <thead>
            <tr><th>Recebida em</th><th>Resultado</th><th className="text-right">Valor</th><th>Cliente</th><th>Cartão</th><th>Pedido</th><th>Evento</th></tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="num whitespace-nowrap text-muted">{formatDate(t.createdAt)}</td>
                <td>
                  <span className={`badge dot ${TX_BADGE[t.result]}`}>{TX_LABEL[t.result]}</span>
                  {t.reason && <span className="mt-1 block text-xs text-muted">{REASON_LABEL[t.reason] ?? t.reason}</span>}
                </td>
                <td className="num whitespace-nowrap text-right font-semibold">{formatMoney(t.amountCents)}</td>
                <td>{t.customer}</td>
                <td className="num whitespace-nowrap font-mono text-xs">{t.card}</td>
                <td className="whitespace-nowrap font-mono text-xs" title={t.orderId}>{shortId(t.orderId)}</td>
                <td className="whitespace-nowrap font-mono text-xs" title={t.eventId}>{shortId(t.eventId)}</td>
              </tr>
            ))}
            {rows.length === 0 && <Empty text="Nenhuma transação nesta página. Rode `npm run simular` para gerar pagamentos." />}
          </tbody>
        </table>
      </div>
      <Pagination tab="transacoes" page={page} pages={pages} total={total} />
    </>
  );
}
