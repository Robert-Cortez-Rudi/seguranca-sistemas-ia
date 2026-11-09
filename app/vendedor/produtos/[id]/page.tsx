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
    <main className="space-y-6">
      <div>
        <Link href="/vendedor" className="link text-sm">← Meus produtos</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="page-title">Editar produto</h1>
          <span className={`badge dot ${product.active ? "bg-mint" : "bg-paper"}`}>{product.active ? "À venda" : "Pausado"}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{product.name}</p>
      </div>
      <section className="card max-w-3xl">
        <div className="card-header">
          <h2 className="section-title">Dados do anúncio</h2>
        </div>
        <div className="p-5 sm:p-6">
          <ProductForm product={product} />
        </div>
      </section>
    </main>
  );
}
