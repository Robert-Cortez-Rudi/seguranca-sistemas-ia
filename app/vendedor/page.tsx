import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { listSellerProducts } from "@/lib/services/seller";

// A01 — Painel do vendedor: só os produtos dele.
export default async function SellerPage() {
  const seller = await requireUser(["SELLER"]);
  const products = await listSellerProducts(seller.id);
  return (
    <main className="mx-auto max-w-4xl space-y-7 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title">Meus produtos</h1>
        <nav className="flex flex-wrap gap-3">
          <Link href="/vendedor/vendas" className="btn btn-sun">Minhas vendas</Link>
          <Link href="/vendedor/produtos/novo" className="btn btn-primary">+ Novo produto</Link>
        </nav>
      </div>
      <div className="table-wrap">
        <table className="table-pop min-w-[560px] text-sm">
          <thead>
            <tr><th>Produto</th><th>Preço</th><th>Estoque</th><th>Situação</th><th><span className="sr-only">Ações</span></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold">{p.name}</td>
                <td className="tabular-nums">{formatMoney(p.priceCents)}</td>
                <td className="tabular-nums">{p.stock}</td>
                <td><span className={`badge ${p.active ? "bg-mint" : "bg-paper"}`}>{p.active ? "À venda" : "Pausado"}</span></td>
                <td className="text-right"><Link href={`/vendedor/produtos/${p.id}`} className="link">Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
