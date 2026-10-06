"use client";

// A10 — Erro inesperado: mensagem genérica para o usuário. O detalhe (stack trace)
// fica só no log do servidor; em produção o Next nem envia a mensagem original ao navegador.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="float relative mx-auto h-40 w-40" aria-hidden="true">
        <span className="burst absolute inset-0 bg-coral" />
        <span className="absolute inset-0 grid place-items-center font-display text-5xl font-extrabold">Ops</span>
      </div>
      <h1 className="page-title mt-6">Algo deu errado</h1>
      <p className="mt-3 text-muted">Não foi possível concluir a operação. Tente novamente em instantes.</p>
      <button onClick={reset} className="btn btn-primary mt-7">
        Tentar de novo
      </button>
    </main>
  );
}
