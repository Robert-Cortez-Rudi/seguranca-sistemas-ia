import { PanelShell } from "@/components/side-nav";

// Moldura do painel do vendedor. A checagem de perfil fica no middleware e em cada página (A01).
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell
      title="Painel do vendedor"
      items={[
        { href: "/vendedor", label: "Meus produtos", icon: "box", exact: true },
        { href: "/vendedor/produtos/novo", label: "Novo produto", icon: "plus" },
        { href: "/vendedor/vendas", label: "Vendas e entregas", icon: "truck" },
      ]}
    >
      {children}
    </PanelShell>
  );
}
