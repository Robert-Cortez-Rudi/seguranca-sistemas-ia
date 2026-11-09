import Link from "next/link";

// Moldura das telas de autenticação (login, cadastro, 2FA, recuperação).
// Desktop: título grande e texto curto à esquerda, formulário à direita, tudo sobre branco
// (referência: páginas de conta das lojas de departamento). Celular: um embaixo do outro.
// Não importa components/header.tsx: esta moldura também é usada por página "use client"
// (esqueci-senha), e o cabeçalho depende de módulos só de servidor.
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-24">
      <section className="lg:pt-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[2.6rem]">{title}</h1>
        {subtitle && <p className="mt-4 max-w-md text-muted">{subtitle}</p>}
        <p className="mt-10 hidden max-w-sm border-t border-line pt-5 text-sm leading-relaxed text-muted lg:block">
          Sua senha é guardada com Argon2id e o login é bloqueado por 15 minutos depois de 5 tentativas
          erradas. Para mais proteção, ative a verificação em duas etapas em{" "}
          <Link href="/conta/seguranca" className="link">Senha e 2FA</Link>.
        </p>
      </section>
      <section>{children}</section>
    </main>
  );
}
