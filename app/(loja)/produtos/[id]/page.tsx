import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { MAX_ITEM_QUANTITY } from "@/lib/schemas";
import { getProduct } from "@/lib/services/catalog";
import { AddToCart } from "./add-to-cart";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = await getProduct((await params).id);
  if (!product) notFound();
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold">{product.name}</h1>
      {/* Texto do vendedor exibido como texto: sem dangerouslySetInnerHTML (A05) */}
      <p className="whitespace-pre-line text-slate-700">{product.description}</p>
      <p className="text-2xl font-bold text-indigo-700">{formatMoney(product.priceCents)}</p>
      <p className="text-sm text-slate-500">Vendido por {product.seller.name}</p>
      {product.stock === 0 ? (
        <p className="font-semibold text-red-600">Esgotado</p>
      ) : user?.role === "CUSTOMER" ? (
        <AddToCart productId={product.id} max={Math.min(product.stock, MAX_ITEM_QUANTITY)} />
      ) : !user ? (
        <Link href={`/entrar?next=/produtos/${product.id}`} className="inline-block text-indigo-600 hover:underline">
          Entre para comprar
        </Link>
      ) : null}
    </main>
  );
}
