import Link from "next/link";
import { SearchIcon } from "@/components/icons";

// Mesma página para "não existe" e "não é seu" (A01: não confirmar a existência do recurso).
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <div className="card px-6 py-12 text-center sm:px-12">
        <span className="mx-auto inline-block text-ink">
          <SearchIcon className="size-7" />
        </span>
        <h1 className="page-title">Página não encontrada</h1>
        <p className="mt-3 text-muted">O endereço não existe ou foi removido.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary btn-lg">
            Voltar para a loja
          </Link>
        </div>
      </div>
    </main>
  );
}
