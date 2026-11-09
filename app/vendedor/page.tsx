import Link from "next/link";
import { BoxIcon, PlusIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { listSellerProducts } from "@/lib/services/seller";

// A01 — Painel do vendedor: só os produtos dele.
export default async function SellerPage() {
  const seller = await requireUser(["SELLER"]);
  const products = await listSellerProducts(seller.id);

  // Métricas calculadas sobre a mesma lista (nenhuma consulta extra).
  const active = products.filter((p) => p.active).length;
  const units = products.reduce((t, p) => t + p.stock, 0);
  const low = products.filter((p) => p.active && p.stock <= 5).length;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Meus produtos</h1>
          <p className="mt-1 text-sm text-muted">Cadastre, edite e pause seus anúncios. Os pedidos chegam em Vendas e entregas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vendedor/vendas" className="btn">Vendas e entregas</Link>
          <Link href="/vendedor/produtos/novo" className="btn btn-primary">
            <PlusIcon className="size-4" /> Novo produto
          </Link>
        </div>
      </div>

      <section aria-label="Resumo" className="grid gap-4 sm:grid-cols-3">
        <div className="tile metric tint-blue">
          <span className="text-sm font-semibold text-muted">Produtos à venda</span>
          <span className="metric-value">{active}</span>
          <span className="text-xs text-muted">de {products.length} cadastrados</span>
        </div>
        <div className="tile metric tint-peach">
          <span className="text-sm font-semibold text-muted">Unidades em estoque</span>
          <span className="metric-value">{units.toLocaleString("pt-BR")}</span>
          <span className="text-xs text-muted">somando todos os produtos</span>
        </div>
        <div className="tile metric tint-yellow">
          <span className="text-sm font-semibold text-muted">Estoque baixo</span>
          <span className={`metric-value ${low > 0 ? "text-danger" : ""}`}>{low}</span>
          <span className="text-xs text-muted">anúncios ativos com 5 unidades ou menos</span>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="card-header">
          <h2 className="section-title">Catálogo</h2>
          <span className="badge bg-paper">{products.length} {products.length === 1 ? "produto" : "produtos"}</span>
        </div>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <BoxIcon className="size-9 text-muted" />
            <p className="font-semibold">Você ainda não tem produtos</p>
            <Link href="/vendedor/produtos/novo" className="btn btn-primary">Cadastrar o primeiro</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-pop min-w-[560px] text-sm">
              <thead>
                <tr><th>Produto</th><th className="text-right">Preço</th><th className="text-right">Estoque</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{p.name}</td>
                    <td className="num text-right">{formatMoney(p.priceCents)}</td>
                    <td className={`num text-right ${p.stock <= 5 ? "font-semibold text-danger" : ""}`}>{p.stock}</td>
                    <td><span className={`badge dot ${p.active ? "bg-mint" : "bg-paper"}`}>{p.active ? "À venda" : "Pausado"}</span></td>
                    <td className="text-right"><Link href={`/vendedor/produtos/${p.id}`} className="btn btn-sm">Editar</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
