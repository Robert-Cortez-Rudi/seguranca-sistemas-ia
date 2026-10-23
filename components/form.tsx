"use client";

import { useFormStatus } from "react-dom";

// Componentes de formulário compartilhados. Todo texto é renderizado pelo React,
// que escapa HTML (A05).

// Dica da política de senha (A07). A regra é aplicada no servidor por
// checkPasswordPolicy() em lib/password.ts; mantenha este texto igual a ela.
export const PASSWORD_HINT =
  "De 12 a 128 caracteres, com pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 símbolo " +
  "(qualquer caractere que não seja letra nem número, como espaço, - , < >). " +
  "Não use senha comum, um único caractere repetido nem o seu e-mail.";

export function Field({
  label,
  name,
  type = "text",
  errors,
  hint,
  id: idProp,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  errors?: string[];
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  // Passe `id` quando a página tiver dois formulários com o mesmo `name`.
  const id = idProp ?? `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : null, errors?.length ? `${id}-err` : null].filter(Boolean).join(" ");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="input"
        {...rest}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={`${id}-err`} className="field-error">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn-primary w-full ${className}`}>
      {pending ? "Aguarde…" : children}
    </button>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <p role="alert" className="notice notice-error">{error}</p>;
  if (success) return <p role="status" className="notice notice-success">{success}</p>;
  return null;
}
