import { PanelShell } from "@/components/side-nav";

// Moldura do painel do ADMIN. A checagem de perfil fica no middleware e em cada página (A01).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelShell
      title="Administração"
      items={[
        { href: "/admin/monitor", label: "Monitor", icon: "chart" },
        { href: "/admin", label: "Auditoria", icon: "list", exact: true },
        { href: "/admin/usuarios", label: "Usuários", icon: "users" },
      ]}
    >
      {children}
    </PanelShell>
  );
}
