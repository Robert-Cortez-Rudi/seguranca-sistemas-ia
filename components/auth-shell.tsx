// Moldura das telas de autenticação (login, cadastro, 2FA, recuperação).
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="card p-6 sm:p-8">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-3 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
