"use client";

import Link from "next/link";
import { ShieldIcon } from "@/components/icons";

// A10 — Erro inesperado: mensagem genérica para o usuário. O detalhe (stack trace)
// fica só no log do servidor; em produção o Next nem envia a mensagem original ao navegador.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <div className="card px-6 py-12 text-center sm:px-12">
        <span className="mx-auto inline-block text-ink">
          <ShieldIcon className="size-7" />
        </span>
        <h1 className="page-title">Algo deu errado</h1>
        <p className="mt-3 text-muted">Não foi possível concluir a operação. Tente novamente em instantes.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn btn-primary btn-lg">
            Tentar de novo
          </button>
          <Link href="/" className="btn btn-lg">
            Ir para a loja
          </Link>
        </div>
      </div>
    </main>
  );
}
