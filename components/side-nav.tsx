"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BoxIcon,
  CardIcon,
  ChartIcon,
  KeyIcon,
  ListIcon,
  PinIcon,
  PlusIcon,
  ReceiptIcon,
  StoreIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

// Navegação lateral das áreas logadas. Só marca o item ativo: quem decide se o usuário
// pode ver a área é o middleware e o requireUser de cada página (A01).
const ICONS = {
  box: BoxIcon,
  card: CardIcon,
  chart: ChartIcon,
  key: KeyIcon,
  list: ListIcon,
  pin: PinIcon,
  plus: PlusIcon,
  receipt: ReceiptIcon,
  store: StoreIcon,
  truck: TruckIcon,
  user: UserIcon,
  users: UsersIcon,
} as const;

export type SideNavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

export function SideNav({ title, items }: { title: string; items: SideNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={title} className="side-nav">
      <p className="mb-3 px-3 text-lg font-extrabold">{title}</p>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map(({ href, label, icon, exact }) => {
          const Icon = ICONS[icon];
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0">
              <Link href={href} aria-current={active ? "page" : undefined} className="whitespace-nowrap">
                <Icon className="size-[1.1rem]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Moldura das áreas logadas: navegação à esquerda (no celular, em cima) e conteúdo à direita. */
export function PanelShell({ title, items, children }: { title: string; items: SideNavItem[]; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <SideNav title={title} items={items} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
