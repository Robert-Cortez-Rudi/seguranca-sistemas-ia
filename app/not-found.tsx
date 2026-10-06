import Link from "next/link";

// Mesma página para "não existe" e "não é seu" (A01: não confirmar a existência do recurso).
export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="float relative mx-auto h-40 w-40" aria-hidden="true">
        <span className="burst absolute inset-0 bg-sun" />
        <span className="absolute inset-0 grid place-items-center font-display text-5xl font-extrabold">404</span>
      </div>
      <h1 className="page-title mt-6">Página não encontrada</h1>
      <p className="mt-3 text-muted">O endereço não existe ou foi removido.</p>
      <Link href="/" className="btn btn-primary mt-7">
        Voltar para a loja
      </Link>
    </main>
  );
}
