import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { canBuy, canSell } from "@/lib/route-access";
import { cartCount } from "@/lib/services/cart";
import { CartIcon, LogoutIcon, SearchIcon, TruckIcon, UserIcon } from "./icons";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`shrink-0 text-[1.45rem] font-extrabold tracking-[-0.03em] text-accent ${className}`}>
      secureshop
    </Link>
  );
}

// Ação do cabeçalho: ícone com rótulo curto embaixo, como nas lojas de departamento.
function HeaderAction({ href, label, children, badge }: { href: string; label: string; children: React.ReactNode; badge?: number }) {
  return (
    <Link href={href} className="relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[0.72rem] font-semibold hover:bg-subtle">
      {children}
      <span className="hidden sm:block">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-1 top-0 grid min-w-[1.1rem] place-items-center rounded-full bg-danger px-1 text-[0.65rem] font-bold leading-[1.1rem] text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

// Busca é um GET simples para "/" (?q=); o servidor valida o termo com Zod (A05).
export async function Header() {
  const user = await getCurrentUser();
  const items = user && canBuy(user.role) ? await cartCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-40 bg-paper">
      <p className="notice-strip px-4 py-1.5 text-center text-xs">
        Pagamento confirmado por webhook assinado<span className="hidden sm:inline"> · CPF, telefone e cartão guardados cifrados</span>
      </p>
      <div className="topbar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 pb-2 pt-4">
          <Logo />

          <form action="/" method="get" role="search" className="search order-last w-full md:order-none md:flex-1">
            <SearchIcon className="search-icon size-5 shrink-0" />
            <label htmlFor="busca" className="sr-only">Buscar produtos</label>
            <input id="busca" name="q" type="search" maxLength={60} placeholder="O que você está procurando?" autoComplete="off" />
            <button type="submit">Buscar</button>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {user ? (
              <>
                <HeaderAction href="/conta" label={`Olá, ${user.name.split(" ")[0]}`}>
                  <UserIcon className="size-6" />
                </HeaderAction>
                {canBuy(user.role) && (
                  <>
                    <HeaderAction href="/conta/pedidos" label="Pedidos">
                      <TruckIcon className="size-6" />
                    </HeaderAction>
                    <HeaderAction href="/carrinho" label="Carrinho" badge={items}>
                      <CartIcon className="size-6" />
                    </HeaderAction>
                  </>
                )}
                <form action={logoutAction}>
                  <button type="submit" className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[0.72rem] font-semibold hover:bg-subtle">
                    <LogoutIcon className="size-6" />
                    <span className="hidden sm:block">Sair</span>
                    <span className="sr-only sm:hidden">Sair</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <HeaderAction href="/entrar" label="Entrar">
                  <UserIcon className="size-6" />
                </HeaderAction>
                <Link href="/cadastro" className="btn btn-dark btn-sm ml-2">Criar conta</Link>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="topbar-sub" aria-label="Atalhos">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 pb-2 text-sm sm:px-3">
          <Link href="/" className="nav-link whitespace-nowrap">Produtos</Link>
          {canBuy(user?.role) && (
            <>
              <Link href="/conta/pedidos" className="nav-link whitespace-nowrap">Meus pedidos</Link>
              <Link href="/conta/enderecos" className="nav-link whitespace-nowrap">Endereços</Link>
              <Link href="/conta/cartoes" className="nav-link whitespace-nowrap">Cartões</Link>
            </>
          )}
          {canSell(user?.role) && (
            <>
              <Link href="/vendedor" className="nav-link whitespace-nowrap">Meus produtos</Link>
              <Link href="/vendedor/vendas" className="nav-link whitespace-nowrap">Vendas e entregas</Link>
            </>
          )}
          {user?.role === "ADMIN" && (
            <>
              <Link href="/admin/monitor" className="nav-link whitespace-nowrap">Monitor</Link>
              <Link href="/admin" className="nav-link whitespace-nowrap">Auditoria</Link>
              <Link href="/admin/usuarios" className="nav-link whitespace-nowrap">Usuários</Link>
            </>
          )}
          {user && <Link href="/conta/seguranca" className="nav-link whitespace-nowrap">Senha e 2FA</Link>}
        </div>
      </nav>
    </header>
  );
}
