"use client";

// A10 — Erro inesperado: mensagem genérica para o usuário. O detalhe (stack trace)
// fica só no log do servidor; em produção o Next nem envia a mensagem original ao navegador.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="mt-2 text-slate-600">Não foi possível concluir a operação. Tente novamente em instantes.</p>
      <button onClick={reset} className="mt-6 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white">
        Tentar de novo
      </button>
    </main>
  );
}
