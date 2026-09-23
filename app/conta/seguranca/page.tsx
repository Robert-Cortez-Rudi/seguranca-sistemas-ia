import { requireUser } from "@/lib/auth";
import { remainingRecoveryCodes } from "@/lib/services/mfa";
import { ChangePasswordForm, MfaSetup } from "./security-forms";

// A07 — Segurança da conta (qualquer perfil logado).
export default async function SecurityPage() {
  const user = await requireUser();
  const remaining = user.totpEnabled ? await remainingRecoveryCodes(user.id) : 0;
  return (
    <main className="mx-auto max-w-lg space-y-10 px-4 py-10">
      <h1 className="text-2xl font-bold">Segurança</h1>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Alterar senha</h2>
        <ChangePasswordForm />
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Verificação em duas etapas</h2>
        <MfaSetup enabled={user.totpEnabled} remainingCodes={remaining} />
      </section>
    </main>
  );
}
