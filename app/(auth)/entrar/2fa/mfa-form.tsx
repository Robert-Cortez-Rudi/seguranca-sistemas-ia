"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import { mfaAction } from "../../actions";

export function MfaForm({ next }: { next: string }) {
  const [state, action] = useActionState(mfaAction, undefined);
  const [recovery, setRecovery] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <FormMessage error={state?.error} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="kind" value={recovery ? "recovery" : "totp"} />
      {recovery ? (
        <Field key="rec" label="Código de recuperação" name="code" placeholder="XXXXX-XXXXX" autoComplete="off" required maxLength={11} />
      ) : (
        <Field key="totp" label="Código do aplicativo autenticador" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required maxLength={6} />
      )}
      <SubmitButton>Verificar</SubmitButton>
      <button type="button" onClick={() => setRecovery(!recovery)} className="text-sm text-indigo-600 hover:underline">
        {recovery ? "Usar o código do aplicativo" : "Usar um código de recuperação"}
      </button>
    </form>
  );
}
