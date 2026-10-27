import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProductImage } from "@/components/product-image";
import { formatMoney } from "@/lib/format";
import { MAX_ITEM_QUANTITY } from "@/lib/schemas";
import { getProduct } from "@/lib/services/catalog";
import { AddToCart } from "./add-to-cart";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await getProduct((await params).id);
  if (!product) notFound();
  const user = await getCurrentUser();

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-2 md:items-start">
      <div className="card overflow-hidden">
        <ProductImage src={product.imageUrl} name={product.name} className="aspect-[4/3] text-8xl" />
      </div>
      <div className="space-y-5">
        <Link href="/" className="link text-sm">← Todos os produtos</Link>
        <h1 className="page-title">{product.name}</h1>
        <p className="text-sm font-semibold text-muted">Vendido por {product.seller.name}</p>
        {/* Texto do vendedor exibido como texto: sem dangerouslySetInnerHTML (A05) */}
        <p className="whitespace-pre-line text-muted">{product.description}</p>
        <p className="price text-5xl">{formatMoney(product.priceCents)}</p>
        {product.stock === 0 ? (
          <p className="badge bg-coral text-sm">Esgotado</p>
        ) : user?.role === "CUSTOMER" ? (
          <div className="card p-5">
            <AddToCart productId={product.id} max={Math.min(product.stock, MAX_ITEM_QUANTITY)} />
          </div>
        ) : !user ? (
          <Link href={`/entrar?next=/produtos/${product.id}`} className="btn btn-primary">
            Entre para comprar <span className="arrow" aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </main>
  );
}
