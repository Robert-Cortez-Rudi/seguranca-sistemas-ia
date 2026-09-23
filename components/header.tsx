import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="text-lg font-bold text-indigo-700">
          SecureShop
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-4">
          {user ? (
            <>
              {user.role === "CUSTOMER" && (
                <>
                  <Link href="/carrinho">Carrinho</Link>
                  <Link href="/conta/pedidos">Meus pedidos</Link>
                </>
              )}
              {user.role === "SELLER" && <Link href="/vendedor">Painel do vendedor</Link>}
              {user.role === "ADMIN" && <Link href="/admin">Administração</Link>}
              <Link href="/conta">{user.name}</Link>
              <form action={logoutAction}>
                <button type="submit" className="text-slate-600 hover:text-slate-900">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar">Entrar</Link>
              <Link href="/cadastro" className="rounded-md bg-indigo-600 px-3 py-1.5 font-semibold text-white">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
