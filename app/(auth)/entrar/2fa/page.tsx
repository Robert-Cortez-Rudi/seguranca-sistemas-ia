import { redirect } from "next/navigation";
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
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Verificação em duas etapas</h1>
      <p className="mb-6 text-sm text-slate-600">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
      <MfaForm next={next} />
    </main>
  );
}
