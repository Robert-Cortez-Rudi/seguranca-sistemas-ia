import Link from "next/link";
import { formatMoney, swatchClass } from "@/lib/format";
import { listProducts } from "@/lib/services/catalog";

const HIGHLIGHTS = ["Dados cifrados", "Senha com Argon2id", "2FA opcional", "Frete calculado no servidor", "Pagamento assinado", "Entrega rastreada"];

// Catálogo público. Nome e descrição vêm de vendedores: o React escapa o HTML (A05).
export default async function Home() {
  const products = await listProducts();
  return (
    <main>
      <section className="relative mx-auto max-w-6xl px-4 pb-12 pt-12 sm:pt-16">
        <p className="badge bg-mint">Loja aberta · {products.length} produtos</p>
        <h1 className="mt-5 max-w-3xl font-display text-[clamp(2.8rem,9vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.045em]">
          Compre <span className="mark">sem medo</span>, receba sem susto.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
          Seus dados cifrados, o total conferido no servidor e a entrega acompanhada do carrinho até a sua porta.
        </p>
        <a href="#produtos" className="btn btn-blue mt-7">
          Ver produtos <span className="arrow" aria-hidden="true">↓</span>
        </a>
        <div className="float absolute right-6 top-10 hidden h-36 w-36 lg:block" aria-hidden="true">
          <span className="burst absolute inset-0 bg-coral" />
          <span className="absolute inset-0 grid -rotate-12 place-items-center text-center font-display text-sm font-extrabold uppercase leading-tight">
            OWASP<br />Top 10
          </span>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...HIGHLIGHTS, ...HIGHLIGHTS, ...HIGHLIGHTS, ...HIGHLIGHTS].map((h, i) => (
            <span key={i}>{h} ✺</span>
          ))}
        </div>
      </div>

      <section id="produtos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
        <h2 className="page-title mb-8">Produtos</h2>
        <ul className="stagger grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/produtos/${p.id}`} className="card card-hover flex h-full flex-col overflow-hidden">
                <div className={`swatch ${swatchClass(p.id)} h-36 text-7xl`} aria-hidden="true">
                  <span>{p.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-extrabold leading-tight tracking-tight">{p.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">{p.description}</p>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                    <p className="price text-2xl">{formatMoney(p.priceCents)}</p>
                    <span className={`badge ${p.stock > 0 ? "bg-mint" : "bg-coral"}`}>
                      {p.stock > 0 ? `${p.stock} em estoque` : "Esgotado"}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center justify-between border-t-2 border-dashed border-ink/25 pt-3 text-xs font-semibold text-muted">
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
