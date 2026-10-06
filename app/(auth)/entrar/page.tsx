import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
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
    <AuthShell title="Entrar" subtitle="Que bom ver você de novo.">
      <LoginForm next={next} notice={notice} />
    </AuthShell>
  );
}
