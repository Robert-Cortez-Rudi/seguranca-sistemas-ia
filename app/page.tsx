import Link from "next/link";
import { LockIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { Price } from "@/components/price";
import { ProductImage } from "@/components/product-image";
import { listProducts, parseSearch } from "@/lib/services/catalog";

// Tons dos blocos de destaque, em ordem (referência: vitrine do Walmart no Mobbin).
const TINTS = ["tint-peach", "tint-yellow", "tint-lilac", "tint-mint"] as const;

const HOW_IT_WORKS = [
  { icon: ShieldIcon, title: "Escolha e adicione ao carrinho", text: "O preço é sempre o do nosso banco, nunca o do navegador." },
  { icon: LockIcon, title: "Pague com cartão salvo", text: "O pagamento é confirmado por um webhook com assinatura HMAC." },
  { icon: TruckIcon, title: "Acompanhe a entrega", text: "Pago, separando, enviado e entregue, em Meus pedidos." },
];

// Catálogo público. Nome e descrição vêm de vendedores: o React escapa o HTML (A05).
// O termo de busca (?q=) é validado em parseSearch antes de chegar ao Prisma.
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = parseSearch((await searchParams).q);
  const products = await listProducts(q);
  const count = `${products.length} ${products.length === 1 ? "item" : "itens"}`;
  const featured = q ? [] : products.filter((p) => p.imageUrl && p.stock > 0).slice(0, 4);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:pt-8">
      {!q && (
        <section aria-label="Destaques" className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
          <div className="tile tint-blue justify-between gap-6 p-6 sm:p-8 md:col-span-2 md:row-span-2">
            <div>
              <h1 className="max-w-md text-3xl font-extrabold leading-tight tracking-[-0.02em] text-accent-strong sm:text-[2.6rem]">
                Compre sem medo, receba sem susto.
              </h1>
              <p className="mt-3 max-w-md text-[1.05rem]">
                Seus dados guardados cifrados, o total conferido no servidor e a entrega acompanhada até a sua porta.
              </p>
              <a href="#produtos" className="btn btn-primary btn-lg mt-6">Ver todos os produtos</a>
            </div>
            <ul className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
              {HOW_IT_WORKS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="text-sm">
                  <Icon className="size-6 text-accent" />
                  <p className="mt-2 font-bold">{title}</p>
                  <p className="mt-0.5 text-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
          {featured.map((p, i) => (
            <Link key={p.id} href={`/produtos/${p.id}`} className={`tile ${TINTS[i % TINTS.length]} group`}>
              <div className="flex items-start justify-between gap-3 p-4 pb-2">
                <div>
                  <p className="font-bold leading-tight group-hover:underline">{p.name}</p>
                  <Price cents={p.priceCents} className="mt-1 block text-xl" />
                </div>
                <span className="btn btn-sm shrink-0 bg-paper">Ver</span>
              </div>
              <ProductImage src={p.imageUrl} name={p.name} className="mt-auto aspect-[16/9] text-4xl" />
            </Link>
          ))}
        </section>
      )}

      <div id="produtos" className={`flex scroll-mt-40 flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line pb-4 ${q ? "" : "mt-12"}`}>
        <div>
          {q ? (
            <h1 className="page-title">Resultados para “{q}”</h1>
          ) : (
            <h2 className="page-title">Todos os produtos</h2>
          )}
          {q && (
            <p className="mt-2 text-muted">
              {count} encontrados. <Link href="/" className="link">Ver todo o catálogo</Link>
            </p>
          )}
        </div>
        {!q && <p className="text-sm text-muted">{count}</p>}
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const inStock = p.stock > 0;
          const lowStock = inStock && p.stock <= 5;
          return (
            <li key={p.id}>
              <Link href={`/produtos/${p.id}`} className="group flex h-full flex-col">
                <div className="product-frame relative overflow-hidden rounded-lg">
                  <ProductImage
                    src={p.imageUrl}
                    name={p.name}
                    className="aspect-square text-6xl transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                  />
                  {lowStock && <span className="price-tag absolute left-2 top-2 rounded text-xs font-bold">Últimas {p.stock}</span>}
                </div>
                <h3 className="mt-3 text-sm font-extrabold uppercase tracking-wide group-hover:text-accent">{p.name}</h3>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted">{p.description}</p>
                <Price cents={p.priceCents} className="mt-2 block text-2xl" />
                <p className={`status mt-2 ${inStock ? "" : "is-out"}`}>{inStock ? "Em estoque" : "Esgotado"}</p>
                <p className="mt-1 text-xs text-muted">Vendido por {p.seller.name}</p>
                <span className="btn btn-sm mt-4 w-full group-hover:border-accent group-hover:bg-accent group-hover:text-white">
                  Ver produto
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {products.length === 0 && (
        <div className="tile tint-blue mt-10 items-center px-6 py-12 text-center">
          <p className="section-title">Nenhum produto encontrado</p>
          <p className="mt-2 text-sm text-muted">
            {q ? "Confira a grafia ou tente uma palavra mais curta, como “fone” ou “mochila”." : "Ainda não há produtos à venda."}
          </p>
          {q && <Link href="/" className="btn btn-primary mt-6">Ver todos os produtos</Link>}
        </div>
      )}
    </main>
  );
}
