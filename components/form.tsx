"use client";

import { useFormStatus } from "react-dom";

// Componentes de formulário compartilhados. Todo texto é renderizado pelo React,
// que escapa HTML (A05).

export function Field({
  label,
  name,
  type = "text",
  errors,
  id: idProp,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  errors?: string[];
} & React.InputHTMLAttributes<HTMLInputElement>) {
  // Passe `id` quando a página tiver dois formulários com o mesmo `name`.
  const id = idProp ?? `f-${name}`;
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
        aria-describedby={errors?.length ? `${id}-err` : undefined}
        className="input"
        {...rest}
      />
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
