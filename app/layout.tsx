import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { headers } from "next/headers";
import { Header } from "@/components/header";
import "./globals.css";

// A02 — next/font baixa as fontes no build e as serve do próprio domínio:
// a CSP continua com font-src 'self', sem liberar CDN nenhuma.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display-face", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "SecureShop",
  description: "E-commerce acadêmico construído sobre o OWASP Top 10:2025",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A02 — Ler o cabeçalho torna toda página dinâmica. Página estática é gerada no build,
  // sem o nonce da requisição, e a CSP bloquearia os scripts do Next.
  await headers();

  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <div className="flex-1">{children}</div>
        <footer className="border-t-[2.5px] border-ink bg-ink px-4 py-5 text-center text-xs font-semibold text-cream">
          SecureShop · projeto acadêmico de Segurança de Sistemas · OWASP Top 10:2025
        </footer>
      </body>
    </html>
  );
}
