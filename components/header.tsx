import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { cartCount } from "@/lib/services/cart";
import { CartIcon, ChartIcon, LogoutIcon, ReceiptIcon, SearchIcon, StoreIcon, UserIcon } from "./icons";

/** Logotipo. `onDark` para a faixa azul (branco + amarelo); sem ele, para fundo claro (azul). */
export function Logo({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  return (
    <Link href="/" className={`shrink-0 text-[1.5rem] font-extrabold tracking-[-0.03em] ${onDark ? "text-white" : "text-accent-strong"} ${className}`}>
      secure<span className={onDark ? "text-deal" : "text-accent"}>shop</span>
    </Link>
  );
}

// Ação do cabeçalho: ícone com rótulo curto embaixo, como nas lojas de departamento.
function HeaderAction({ href, label, children, badge }: { href: string; label: string; children: React.ReactNode; badge?: number }) {
  return (
    <Link href={href} className="head-action relative flex flex-col items-center gap-0.5 px-2.5 py-1 text-[0.72rem] font-semibold">
      {children}
      <span className="hidden sm:block">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-1 top-0 grid min-w-[1.15rem] place-items-center rounded-full bg-deal px-1 text-[0.68rem] font-bold leading-[1.15rem] text-ink">
          {badge}
        </span>
      )}
    </Link>
  );
}

// Busca é um GET simples para "/" (?q=); o servidor valida o termo com Zod (A05).
export async function Header() {
  const user = await getCurrentUser();
  const items = user?.role === "CUSTOMER" ? await cartCount(user.id) : 0;
  // Atalho para o painel de quem não é cliente: o primeiro lugar para onde o usuário quer ir.
  const panel =
    user?.role === "ADMIN"
      ? { href: "/admin/monitor", label: "Painel do admin", icon: <ChartIcon className="size-4" /> }
      : user?.role === "SELLER"
        ? { href: "/vendedor", label: "Painel do vendedor", icon: <StoreIcon className="size-4" /> }
        : null;

  return (
    <header className="sticky top-0 z-40">
      <p className="notice-strip px-4 py-1.5 text-center text-xs">
        Pagamento confirmado por webhook assinado<span className="hidden sm:inline"> · CPF, telefone e cartão guardados cifrados</span>
      </p>
      <div className="topbar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Logo onDark />

          <form action="/" method="get" role="search" className="search order-last w-full md:order-none md:flex-1">
            <label htmlFor="busca" className="sr-only">Buscar produtos</label>
            <input id="busca" name="q" type="search" maxLength={60} placeholder="Buscar produtos, ex.: fone, mochila…" autoComplete="off" />
            <button type="submit" aria-label="Buscar">
              <SearchIcon className="size-5" />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {user ? (
              <>
                <HeaderAction href="/conta" label={`Olá, ${user.name.split(" ")[0]}`}>
                  <UserIcon className="size-6" />
                </HeaderAction>
                {user.role === "CUSTOMER" && (
                  <>
                    <HeaderAction href="/conta/pedidos" label="Pedidos">
                      <ReceiptIcon className="size-6" />
                    </HeaderAction>
                    <HeaderAction href="/carrinho" label="Carrinho" badge={items}>
                      <CartIcon className="size-6" />
                    </HeaderAction>
                  </>
                )}
                <form action={logoutAction}>
                  <button type="submit" className="head-action flex cursor-pointer flex-col items-center gap-0.5 px-2.5 py-1 text-[0.72rem] font-semibold">
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
                <Link href="/cadastro" className="btn btn-sm ml-2 border-white bg-white text-accent-strong hover:border-deal hover:bg-deal hover:text-ink">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <nav className="topbar-sub" aria-label="Atalhos">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 py-1.5 text-sm sm:px-3">
          <Link href="/" className="nav-link whitespace-nowrap">Todos os produtos</Link>
          {user?.role === "CUSTOMER" && (
            <>
              <Link href="/conta/pedidos" className="nav-link whitespace-nowrap">Meus pedidos</Link>
              <Link href="/conta/enderecos" className="nav-link whitespace-nowrap">Endereços</Link>
              <Link href="/conta/cartoes" className="nav-link whitespace-nowrap">Cartões</Link>
            </>
          )}
          {user?.role === "SELLER" && (
            <>
              <Link href="/vendedor/produtos/novo" className="nav-link whitespace-nowrap">Cadastrar produto</Link>
              <Link href="/vendedor/vendas" className="nav-link whitespace-nowrap">Vendas e entregas</Link>
            </>
          )}
          {user?.role === "ADMIN" && (
            <>
              <Link href="/admin" className="nav-link whitespace-nowrap">Auditoria</Link>
              <Link href="/admin/usuarios" className="nav-link whitespace-nowrap">Usuários</Link>
            </>
          )}
          {user && <Link href="/conta/seguranca" className="nav-link whitespace-nowrap">Senha e 2FA</Link>}
          {panel && (
            <Link href={panel.href} className="btn btn-primary btn-sm ml-auto shrink-0 whitespace-nowrap">
              {panel.icon}
              {panel.label}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
