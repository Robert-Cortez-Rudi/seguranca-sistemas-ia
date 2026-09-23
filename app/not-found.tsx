import Link from "next/link";

// Mesma página para "não existe" e "não é seu" (A01: não confirmar a existência do recurso).
export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-slate-600">O endereço não existe ou foi removido.</p>
      <Link href="/" className="mt-6 inline-block text-indigo-600 hover:underline">
        Voltar para a loja
      </Link>
    </main>
  );
}
