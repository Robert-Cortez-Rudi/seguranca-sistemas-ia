import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { listSellerProducts } from "@/lib/services/seller";

// A01 — Painel do vendedor: só os produtos dele.
export default async function SellerPage() {
  const seller = await requireUser(["SELLER"]);
  const products = await listSellerProducts(seller.id);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Meus produtos</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/vendedor/vendas" className="text-indigo-600 hover:underline">Minhas vendas</Link>
          <Link href="/vendedor/produtos/novo" className="rounded-md bg-indigo-600 px-3 py-1.5 font-semibold text-white">Novo produto</Link>
        </nav>
      </div>
      <table className="w-full rounded-lg bg-white text-sm shadow-sm">
        <thead className="text-left text-slate-500">
          <tr><th className="p-3">Produto</th><th className="p-3">Preço</th><th className="p-3">Estoque</th><th className="p-3">Situação</th><th /></tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3">{p.name}</td>
              <td className="p-3">{formatMoney(p.priceCents)}</td>
              <td className="p-3">{p.stock}</td>
              <td className="p-3">{p.active ? "À venda" : "Pausado"}</td>
              <td className="p-3 text-right"><Link href={`/vendedor/produtos/${p.id}`} className="text-indigo-600 hover:underline">Editar</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
