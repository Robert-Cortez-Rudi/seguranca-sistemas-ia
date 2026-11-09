import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, LockIcon, ShieldIcon, StoreIcon, TruckIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { ProductImage } from "@/components/product-image";
import { Price } from "@/components/price";
import { MAX_ITEM_QUANTITY } from "@/lib/schemas";
import { getProduct } from "@/lib/services/catalog";
import { AddToCart } from "./add-to-cart";

const GUARANTEES = [
  { icon: TruckIcon, title: "Frete calculado no checkout", text: "Pelo estado do endereço de entrega escolhido." },
  { icon: LockIcon, title: "Pagamento confirmado por webhook assinado", text: "O pedido só é pago com assinatura HMAC válida." },
  { icon: ShieldIcon, title: "Preço conferido no servidor", text: "O valor cobrado é sempre o do nosso banco de dados." },
];

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await getProduct((await params).id);
  if (!product) notFound();
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-8">
      <nav aria-label="Caminho" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/" className="hover:text-ink hover:underline">Produtos</Link>
        <ChevronRightIcon className="size-3.5" />
        <span className="truncate text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
        <div className="space-y-10">
          <div className="product-frame overflow-hidden">
            <ProductImage src={product.imageUrl} name={product.name} className="aspect-square text-8xl" />
          </div>
          <section className="border-t border-line pt-6">
            <h2 className="section-title">Sobre o produto</h2>
            {/* Texto do vendedor exibido como texto: sem dangerouslySetInnerHTML (A05) */}
            <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed">{product.description}</p>
          </section>
        </div>

        <div className="lg:sticky lg:top-40 lg:self-start">
          <h1 className="text-2xl font-extrabold uppercase tracking-wide sm:text-[1.7rem]">{product.name}</h1>
          <p className="mt-1 line-clamp-2 text-muted">{product.description}</p>
          <Price cents={product.priceCents} className="mt-4 block text-[2.6rem] leading-none" />
          {product.stock > 0 && product.stock <= 5 && (
            <p className="price-tag mt-4 text-sm font-bold">Últimas {product.stock} unidades</p>
          )}

          <ul className="mt-6 space-y-2 border-y border-line py-5">
            <li className={`status ${product.stock > 0 ? "" : "is-out"}`}>{product.stock > 0 ? "Em estoque" : "Esgotado"}</li>
            <li className="flex items-center gap-2 text-sm">
              <StoreIcon className="size-4" />
              Vendido por <span className="font-semibold">{product.seller.name}</span>
            </li>
          </ul>

          <div className="mt-6">
            {product.stock === 0 ? (
              <p className="notice notice-error">Este produto está esgotado no momento.</p>
            ) : user?.role === "CUSTOMER" ? (
              <AddToCart productId={product.id} max={Math.min(product.stock, MAX_ITEM_QUANTITY)} />
            ) : !user ? (
              <Link href={`/entrar?next=/produtos/${product.id}`} className="btn btn-primary btn-lg w-full">
                Entre para comprar
              </Link>
            ) : (
              <p className="notice">Somente contas de cliente podem comprar.</p>
            )}
          </div>

          <ul className="mt-8 space-y-4">
            {GUARANTEES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0" />
                <span>
                  <span className="block text-sm font-bold">{title}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
