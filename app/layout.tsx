import type { Metadata } from "next";
import { headers } from "next/headers";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureShop",
  description: "E-commerce acadêmico construído sobre o OWASP Top 10:2025",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A02 — Ler o cabeçalho torna toda página dinâmica. Página estática é gerada no build,
  // sem o nonce da requisição, e a CSP bloquearia os scripts do Next.
  await headers();

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        {children}
      </body>
    </html>
  );
}
