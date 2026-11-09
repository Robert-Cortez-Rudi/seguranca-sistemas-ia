import Link from "next/link";
import { Price } from "@/components/price";
import { ProductImage } from "@/components/product-image";
import { listProducts, parseSearch } from "@/lib/services/catalog";

// Catálogo público. Nome e descrição vêm de vendedores: o React escapa o HTML (A05).
// O termo de busca (?q=) é validado em parseSearch antes de chegar ao Prisma.
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = parseSearch((await searchParams).q);
  const products = await listProducts(q);
  const count = `${products.length} ${products.length === 1 ? "item" : "itens"}`;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line pb-5">
        <div>
          <h1 className="page-title">{q ? `Resultados para “${q}”` : "Todos os produtos"}</h1>
          <p className="mt-2 max-w-2xl text-muted">
            {q ? (
              <>
                {count} encontrados. <Link href="/" className="link">Ver todo o catálogo</Link>
              </>
            ) : (
              "Preço conferido no servidor e entrega acompanhada do pagamento até a sua porta."
            )}
          </p>
        </div>
        {!q && <p className="text-sm text-muted">{count}</p>}
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const inStock = p.stock > 0;
          const lowStock = inStock && p.stock <= 5;
          return (
            <li key={p.id}>
              <Link href={`/produtos/${p.id}`} className="group block">
                <div className="product-frame overflow-hidden">
                  <ProductImage
                    src={p.imageUrl}
                    name={p.name}
                    className="aspect-square text-6xl transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                {lowStock && <p className="price-tag mt-3 text-xs font-bold">Últimas {p.stock} unidades</p>}
                <h2 className={`${lowStock ? "mt-2" : "mt-3"} text-sm font-extrabold uppercase tracking-wide group-hover:underline`}>
                  {p.name}
                </h2>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">{p.description}</p>
                <Price cents={p.priceCents} className="mt-2 block text-2xl" />
                <p className="mt-3 text-xs text-muted">Vendido por {p.seller.name}</p>
                <p className={`status mt-1.5 ${inStock ? "" : "is-out"}`}>{inStock ? "Em estoque" : "Esgotado"}</p>
              </Link>
            </li>
          );
        })}
      </ul>

      {products.length === 0 && (
        <div className="mt-10 rounded-lg bg-subtle px-6 py-12 text-center">
          <p className="section-title">Nenhum produto encontrado</p>
          <p className="mt-2 text-sm text-muted">
            {q ? "Confira a grafia ou tente uma palavra mais curta." : "Ainda não há produtos à venda."}
          </p>
          {q && <Link href="/" className="btn btn-dark mt-6">Ver todos os produtos</Link>}
        </div>
      )}
    </main>
  );
}
