import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { listProducts } from "@/lib/services/catalog";

// Catálogo público. Nome e descrição vêm de vendedores: o React escapa o HTML (A05).
export default async function Home() {
  const products = await listProducts();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Produtos</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/produtos/${p.id}`} className="block h-full rounded-lg bg-white p-5 shadow-sm hover:shadow-md">
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>
              <p className="mt-3 text-lg font-bold text-indigo-700">{formatMoney(p.priceCents)}</p>
              <p className="text-xs text-slate-500">
                {p.stock > 0 ? `${p.stock} em estoque` : "Esgotado"} · vendido por {p.seller.name}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {products.length === 0 && <p className="text-slate-500">Nenhum produto disponível.</p>}
    </main>
  );
}
