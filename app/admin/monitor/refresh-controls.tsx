"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { RefreshIcon } from "@/components/icons";

const INTERVALS = [
  { value: 0, label: "Desligada" },
  { value: 5, label: "A cada 5 s" },
  { value: 10, label: "A cada 10 s" },
  { value: 30, label: "A cada 30 s" },
];

// Botão "Atualizar" e atualização automática opcional. router.refresh() pede ao servidor
// a página de novo (com a mesma aba e página da URL): as contagens nunca vêm do navegador.
export function RefreshControls({ updatedAt }: { updatedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [every, setEvery] = useState(0);

  const refresh = () => startTransition(() => router.refresh());

  useEffect(() => {
    if (every === 0) return;
    const t = setInterval(() => startTransition(() => router.refresh()), every * 1000);
    return () => clearInterval(t);
  }, [every, router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-1 text-xs text-muted" aria-live="polite">
        Atualizado às <span className="num font-semibold text-ink">{updatedAt}</span>
      </p>
      <label htmlFor="auto-refresh" className="sr-only">Atualização automática</label>
      <select
        id="auto-refresh"
        value={every}
        onChange={(e) => setEvery(Number(e.target.value))}
        className="input w-auto py-1 text-sm"
        title="Atualização automática"
      >
        {INTERVALS.map((i) => (
          <option key={i.value} value={i.value}>
            {i.value === 0 ? "Automático: desligado" : i.label}
          </option>
        ))}
      </select>
      <button type="button" onClick={refresh} disabled={pending} className="btn btn-primary">
        <RefreshIcon className={`size-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Atualizando…" : "Atualizar"}
      </button>
    </div>
  );
}
