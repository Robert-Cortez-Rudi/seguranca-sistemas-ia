import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentSession, safeRedirectPath } from "@/lib/auth";
import { MfaForm } from "./mfa-form";

// A07 — Segunda etapa do login. Só abre com uma sessão provisória (mfaPending) válida.
export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeRedirectPath((await searchParams).next);
  const session = await getCurrentSession();
  if (!session) redirect("/entrar");
  if (!session.mfaPending) redirect(next);

  return (
    <AuthShell title="Verificação em duas etapas" subtitle="Digite o código de 6 dígitos do seu aplicativo autenticador.">
      <MfaForm next={next} />
    </AuthShell>
  );
}
