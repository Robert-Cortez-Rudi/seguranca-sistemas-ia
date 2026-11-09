import { KeyIcon, ShieldIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { remainingRecoveryCodes } from "@/lib/services/mfa";
import { ChangePasswordForm, MfaSetup } from "./security-forms";

// A07 — Segurança da conta (qualquer perfil logado).
export default async function SecurityPage() {
  const user = await requireUser();
  const remaining = user.totpEnabled ? await remainingRecoveryCodes(user.id) : 0;
  return (
    <main className="space-y-6">
      <div>
        <h1 className="page-title">Segurança</h1>
        <p className="mt-1 text-sm text-muted">Troque a senha e ative a verificação em duas etapas. Trocar a senha encerra suas outras sessões.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card h-fit">
          <div className="card-header">
            <h2 className="section-title flex items-center gap-2">
              <KeyIcon className="size-5 text-accent" /> Alterar senha
            </h2>
          </div>
          <div className="p-5 sm:p-6">
            <ChangePasswordForm />
          </div>
        </section>
        <section className="card h-fit">
          <div className="card-header">
            <h2 className="section-title flex items-center gap-2">
              <ShieldIcon className="size-5 text-accent" /> Verificação em duas etapas
            </h2>
            <span className={`badge dot ${user.totpEnabled ? "bg-mint" : "bg-sun"}`}>{user.totpEnabled ? "Ativa" : "Desativada"}</span>
          </div>
          <div className="p-5 sm:p-6">
            <MfaSetup enabled={user.totpEnabled} remainingCodes={remaining} />
          </div>
        </section>
      </div>
    </main>
  );
}
