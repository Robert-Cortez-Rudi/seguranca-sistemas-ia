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
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Editar produto</h1>
      <ProductForm product={product} />
    </main>
  );
}
