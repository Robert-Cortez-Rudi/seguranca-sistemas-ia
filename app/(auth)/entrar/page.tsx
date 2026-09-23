import { redirect } from "next/navigation";
import { getCurrentUser, safeRedirectPath } from "@/lib/auth";
import { LoginForm } from "./login-form";

// A07 — Página de login. A lógica está em lib/services/auth.ts.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  if (await getCurrentUser()) redirect(next);

  const notices: Record<string, string> = {
    cadastro: "Conta criada. Entre com seu e-mail e senha.",
    senha: "Senha redefinida. Entre com a nova senha.",
  };
  const notice = params.cadastro === "ok" ? notices.cadastro : params.senha === "ok" ? notices.senha : undefined;

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Entrar</h1>
      <LoginForm next={next} notice={notice} />
    </main>
  );
}
