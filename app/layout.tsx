import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { Header } from "@/components/header";
import "./globals.css";

// A02 — next/font baixa as fontes no build e as serve do próprio domínio:
// a CSP continua com font-src 'self', sem liberar CDN nenhuma.
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "SecureShop",
  description: "E-commerce acadêmico construído sobre o OWASP Top 10:2025",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A02 — Ler o cabeçalho torna toda página dinâmica. Página estática é gerada no build,
  // sem o nonce da requisição, e a CSP bloquearia os scripts do Next.
  await headers();

  return (
    <html lang="pt-BR" className={body.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-line bg-paper px-4 py-5 text-center text-xs text-muted">
          SecureShop · projeto acadêmico de Segurança de Sistemas · OWASP Top 10:2025 · <a href="/produtos/CREDITOS.txt" className="underline">Créditos das fotos</a>
        </footer>
      </body>
    </html>
  );
}
