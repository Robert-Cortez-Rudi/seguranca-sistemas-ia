import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

// A07 — Cadastro de cliente. Regras em lib/services/auth.ts.
export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Criar conta</h1>
      <RegisterForm />
    </main>
  );
}
