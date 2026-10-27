import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { formatMoney } from "@/lib/format";
import { listProducts } from "@/lib/services/catalog";

// Catálogo público. Nome e descrição vêm de vendedores: o React escapa o HTML (A05).
export default async function Home() {
  const products = await listProducts();
  return (
    <main>
      <section className="border-b border-line bg-[#eef2f8]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <p className="badge bg-paper">Loja aberta · {products.length} produtos</p>
        <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          Compre sem medo, receba sem susto.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
          Seus dados cifrados, o total conferido no servidor e a entrega acompanhada do carrinho até a sua porta.
        </p>
        <a href="#produtos" className="btn btn-primary mt-6">
          Ver produtos
        </a>
        </div>
      </section>

      <section id="produtos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <h2 className="page-title mb-8">Produtos</h2>
        <ul className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/produtos/${p.id}`} className="card card-hover flex h-full flex-col overflow-hidden">
                <ProductImage src={p.imageUrl} name={p.name} className="aspect-[4/3] text-6xl" />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold leading-tight tracking-tight">{p.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">{p.description}</p>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                    <p className="price text-2xl">{formatMoney(p.priceCents)}</p>
                    <span className={`badge ${p.stock > 0 ? "bg-mint" : "bg-coral"}`}>
                      {p.stock > 0 ? `${p.stock} em estoque` : "Esgotado"}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs font-semibold text-muted">
                    <span>vendido por {p.seller.name}</span>
                    <span className="arrow text-base text-ink" aria-hidden="true">→</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {products.length === 0 && <p className="card p-6 text-muted">Nenhum produto disponível.</p>}
      </section>
    </main>
  );
}
