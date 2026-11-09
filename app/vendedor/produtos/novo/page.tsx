import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProductForm } from "../../product-form";

// A01 — Cadastro de produto (só SELLER).
export default async function NewProductPage() {
  await requireUser(["SELLER"]);
  return (
    <main className="space-y-6">
      <div>
        <Link href="/vendedor" className="link text-sm">← Meus produtos</Link>
        <h1 className="page-title">Novo produto</h1>
        <p className="mt-1 text-sm text-muted">O preço é gravado em centavos e o checkout sempre usa o valor do banco.</p>
      </div>
      <section className="card max-w-3xl">
        <div className="card-header">
          <h2 className="section-title">Dados do anúncio</h2>
        </div>
        <div className="p-5 sm:p-6">
          <ProductForm />
        </div>
      </section>
    </main>
  );
}
