"use client";

// A10 — Erro inesperado: mensagem genérica para o usuário. O detalhe (stack trace)
// fica só no log do servidor; em produção o Next nem envia a mensagem original ao navegador.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-5xl font-semibold text-muted" aria-hidden="true">Ops</p>
      <h1 className="page-title mt-6">Algo deu errado</h1>
      <p className="mt-3 text-muted">Não foi possível concluir a operação. Tente novamente em instantes.</p>
      <button onClick={reset} className="btn btn-primary mt-7">
        Tentar de novo
      </button>
    </main>
  );
}
