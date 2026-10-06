import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
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
    <AuthShell title="Redefinir senha">
      {usable ? (
        <ResetForm token={token} />
      ) : (
        <p className="notice notice-error">
          Link inválido ou expirado.{" "}
          <Link href="/esqueci-senha" className="link">
            Peça um novo
          </Link>
          .
        </p>
      )}
    </AuthShell>
  );
}
