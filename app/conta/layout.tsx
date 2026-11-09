import { PanelShell, type SideNavItem } from "@/components/side-nav";
import { getCurrentUser } from "@/lib/auth";

// Moldura da área do usuário. A checagem de sessão fica no middleware e em cada página (A01);
// aqui só se escolhe quais atalhos mostrar para o perfil.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const items: SideNavItem[] = [
    { href: "/conta", label: "Meus dados", icon: "user", exact: true },
    ...(user?.role === "CUSTOMER"
      ? ([
          { href: "/conta/pedidos", label: "Pedidos", icon: "receipt" },
          { href: "/conta/enderecos", label: "Endereços", icon: "pin" },
          { href: "/conta/cartoes", label: "Cartões", icon: "card" },
        ] satisfies SideNavItem[])
      : []),
    { href: "/conta/seguranca", label: "Segurança", icon: "key" },
  ];
  return (
    <PanelShell title="Minha conta" items={items}>
      {children}
    </PanelShell>
  );
}
