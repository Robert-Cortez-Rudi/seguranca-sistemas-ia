import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSellerProduct } from "@/lib/services/seller";
import { ProductForm } from "../../product-form";

// A01 — Produto de outro vendedor responde 404.
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const seller = await requireUser(["SELLER"]);
  const product = await getSellerProduct(seller.id, (await params).id);
  if (!product) notFound();
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <Link href="/vendedor" className="link text-sm">← Meus produtos</Link>
      <h1 className="page-title">Editar produto</h1>
      <div className="card p-6">
        <ProductForm product={product} />
      </div>
    </main>
  );
}
