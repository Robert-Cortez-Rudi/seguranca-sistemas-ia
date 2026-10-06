import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b-[2.5px] border-ink bg-cream/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm">
        <Link href="/" className="logo flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight">
          <span className="logo-gem" aria-hidden="true" />
          SecureShop
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          {user ? (
            <>
              {user.role === "CUSTOMER" && (
                <>
                  <Link href="/carrinho" className="nav-link">Carrinho</Link>
                  <Link href="/conta/pedidos" className="nav-link">Meus pedidos</Link>
                </>
              )}
              {user.role === "SELLER" && <Link href="/vendedor" className="nav-link">Painel do vendedor</Link>}
              {user.role === "ADMIN" && <Link href="/admin" className="nav-link">Administração</Link>}
              <Link href="/conta" className="badge bg-sun py-1 normal-case tracking-normal text-[0.8rem] transition-transform hover:-rotate-2 hover:scale-105">
                {user.name}
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="nav-link cursor-pointer text-muted hover:text-ink">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className="nav-link">Entrar</Link>
              <Link href="/cadastro" className="btn btn-primary btn-sm">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
