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
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-err` : undefined}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        {...rest}
      />
      {errors?.length ? (
        <p id={`${id}-err`} className="text-xs text-red-600">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 ${className}`}
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (success) return <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>;
  return null;
}
