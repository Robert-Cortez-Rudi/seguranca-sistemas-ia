"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { changePasswordAction, mfaSetupAction, type MfaState } from "./actions";

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  const fe = state?.fieldErrors;
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} success={state?.success} />
      <Field label="Senha atual" name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} errors={fe?.currentPassword} />
      <Field label="Nova senha (mínimo 12 caracteres)" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} errors={fe?.password} />
      <Field label="Confirme a nova senha" name="confirmPassword" type="password" autoComplete="new-password" required maxLength={128} errors={fe?.confirmPassword} />
      <SubmitButton>Alterar senha</SubmitButton>
    </form>
  );
}

export function MfaSetup({ enabled, remainingCodes }: { enabled: boolean; remainingCodes: number }) {
  const [state, action] = useActionState<MfaState, FormData>(mfaSetupAction, { step: "idle" });

  if (state.step === "codes") {
    return (
      <div className="space-y-3">
        <FormMessage success="Verificação em duas etapas ativada." />
        <p className="text-sm text-muted">
          Guarde estes códigos de recuperação num lugar seguro. Cada um funciona uma vez e eles <strong>não serão mostrados de novo</strong>.
        </p>
        <ul className="stagger grid grid-cols-2 gap-2 rounded-xl border-[2.5px] border-dashed border-ink bg-sun p-4 font-mono text-sm font-semibold">
          {state.recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (state.step === "scan") {
    return (
      <form action={action} className="space-y-4">
        <FormMessage error={state.error} />
        <p className="text-sm text-muted">Escaneie o QR code no seu aplicativo autenticador e digite o código gerado.</p>
        {/* data: URL gerada no servidor; a CSP libera img-src data: */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.qrDataUrl} alt="QR code para o aplicativo autenticador" width={220} height={220} className="rounded-xl border-[2.5px] border-ink bg-white p-2 shadow-hard-sm" />
        <p className="text-xs text-muted">
          Sem câmera? Digite a chave: <code className="break-all">{state.secret}</code>
        </p>
        <input type="hidden" name="intent" value="confirm" />
        <Field id="mfa-enroll-code" label="Código de 6 dígitos" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required maxLength={6} />
        <SubmitButton>Ativar</SubmitButton>
      </form>
    );
  }

  if (enabled && !state.success) {
    return (
      <form action={action} className="space-y-4">
        <FormMessage error={state.error} />
        <p className="notice notice-success">Ativa. Códigos de recuperação restantes: {remainingCodes}.</p>
        <input type="hidden" name="intent" value="disable" />
        <Field id="mfa-password" label="Senha atual" name="password" type="password" autoComplete="current-password" required maxLength={128} />
        <Field id="mfa-disable-code" label="Código do aplicativo" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required maxLength={6} />
        <SubmitButton className="btn-danger">Desativar 2FA</SubmitButton>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state.error} success={state.success} />
      <p className="text-sm text-muted">Proteja sua conta com um código do aplicativo autenticador além da senha.</p>
      <input type="hidden" name="intent" value="start" />
      <SubmitButton>Configurar 2FA</SubmitButton>
    </form>
  );
}
