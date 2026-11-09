import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { Header, Logo } from "@/components/header";
import "./globals.css";

// A02 — next/font baixa as fontes no build e as serve do próprio domínio:
// a CSP continua com font-src 'self', sem liberar CDN nenhuma.
const body = Noto_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-body", display: "swap" });

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
        <footer className="mt-20 bg-subtle text-sm">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="space-y-3">
              <Logo />
              <p className="max-w-xs leading-relaxed text-muted">
                Loja-escola de Segurança de Sistemas. Cada controle segue o OWASP Top 10:2025.
              </p>
            </div>
            <div>
              <p className="mb-3 font-bold">Comprar</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/" className="hover:text-ink hover:underline">Todos os produtos</Link></li>
                <li><Link href="/carrinho" className="hover:text-ink hover:underline">Carrinho</Link></li>
                <li><Link href="/conta/pedidos" className="hover:text-ink hover:underline">Acompanhar pedido</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-bold">Sua conta</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/entrar" className="hover:text-ink hover:underline">Entrar</Link></li>
                <li><Link href="/cadastro" className="hover:text-ink hover:underline">Criar conta</Link></li>
                <li><Link href="/conta/seguranca" className="hover:text-ink hover:underline">Senha e 2FA</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-bold">Como protegemos você</p>
              <ul className="space-y-2 text-muted">
                <li>Dados pessoais cifrados com AES-256-GCM</li>
                <li>Senhas guardadas com Argon2id</li>
                <li>Preço e frete conferidos no servidor</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-line">
            <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted">
              © SecureShop · projeto acadêmico, dados fictícios ·{" "}
              <a href="/produtos/CREDITOS.txt" className="underline hover:text-ink">Créditos das fotos</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
