"use client";

import "./globals.css";

// A10 — Último recurso quando o próprio layout falha. Sem detalhes técnicos na tela.
// Sem style inline: a CSP de produção não libera 'unsafe-inline' em estilos.
export default function GlobalError() {
  return (
    <html lang="pt-BR">
      <body className="px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Serviço indisponível</h1>
        <p className="mt-2">Tente novamente em alguns minutos.</p>
      </body>
    </html>
  );
}
