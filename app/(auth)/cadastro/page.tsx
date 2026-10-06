import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

// A07 — Cadastro de cliente. Regras em lib/services/auth.ts.
export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <AuthShell title="Criar conta" subtitle="Leva um minuto. CPF e telefone ficam cifrados no banco.">
      <RegisterForm />
    </AuthShell>
  );
}
