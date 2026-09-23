import { requireUser } from "@/lib/auth";
import { ProductForm } from "../../product-form";

// A01 — Cadastro de produto (só SELLER).
export default async function NewProductPage() {
  await requireUser(["SELLER"]);
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Novo produto</h1>
      <ProductForm />
    </main>
  );
}
