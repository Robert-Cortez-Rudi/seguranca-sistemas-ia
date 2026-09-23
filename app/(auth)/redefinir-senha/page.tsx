import Link from "next/link";
import { isResetTokenUsable } from "@/lib/services/password";
import { ResetForm } from "./reset-form";

// A07 — Redefinição pelo link do e-mail. O token é validado de novo ao enviar o formulário.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await searchParams;
  const usable = typeof token === "string" && (await isResetTokenUsable(token));

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Redefinir senha</h1>
      {usable ? (
        <ResetForm token={token} />
      ) : (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Link inválido ou expirado.{" "}
          <Link href="/esqueci-senha" className="font-semibold underline">
            Peça um novo
          </Link>
          .
        </p>
      )}
    </main>
  );
}
