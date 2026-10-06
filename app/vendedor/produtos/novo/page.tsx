import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProductForm } from "../../product-form";

// A01 — Cadastro de produto (só SELLER).
export default async function NewProductPage() {
  await requireUser(["SELLER"]);
  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
      <Link href="/vendedor" className="link text-sm">← Meus produtos</Link>
      <h1 className="page-title">Novo produto</h1>
      <div className="card p-6">
        <ProductForm />
      </div>
    </main>
  );
}
