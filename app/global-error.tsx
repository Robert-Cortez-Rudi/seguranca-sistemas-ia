"use client";

import "./globals.css";

// A10 — Último recurso quando o próprio layout falha. Sem detalhes técnicos na tela.
// Sem style inline: a CSP de produção não libera 'unsafe-inline' em estilos.
export default function GlobalError() {
  return (
    <html lang="pt-BR">
      <body className="grid min-h-screen place-items-center bg-cream px-4">
        <main className="card max-w-md px-8 py-12 text-center">
          <h1 className="page-title">Serviço indisponível</h1>
          <p className="mt-3 text-muted">Tente novamente em alguns minutos.</p>
        </main>
      </body>
    </html>
  );
}
