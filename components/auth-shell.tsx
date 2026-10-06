// Moldura das telas de autenticação (login, cadastro, 2FA, recuperação).
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="card relative p-6 sm:p-8">
        <span className="float absolute -right-5 -top-7 block h-16 w-16" aria-hidden="true">
          <span className="burst block h-full w-full bg-sun" />
        </span>
        <span className="absolute -bottom-4 -left-4 block h-9 w-9 rotate-12 rounded-lg border-[2.5px] border-ink bg-cobalt" aria-hidden="true" />
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-3 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
