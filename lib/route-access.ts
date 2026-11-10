import type { Role } from "@prisma/client";

// A01 — Mapa de áreas protegidas por perfil, usado pelo middleware.
// As páginas e Server Actions repetem a checagem com requireUser (defesa em profundidade).
const PROTECTED: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/vendedor", roles: ["SELLER"] },
  { prefix: "/conta", roles: ["CUSTOMER", "SELLER", "ADMIN"] },
  { prefix: "/carrinho", roles: ["CUSTOMER"] },
  { prefix: "/checkout", roles: ["CUSTOMER"] },
];

/** Perfis exigidos para o caminho, ou null se a rota é pública. */
export function requiredRoles(pathname: string): Role[] | null {
  // Normaliza: decodifica %xx, minúsculas, sem barras repetidas e sem barra final
  // ("/%41dmin//" → "/admin"). Caminho mal codificado é tratado como protegido (fail closed).
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return ["ADMIN"];
  }
  const path = decoded.toLowerCase().replace(/\/{2,}/g, "/").replace(/(.)\/$/, "$1");
  const rule = PROTECTED.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  return rule ? rule.roles : null;
}

/**
 * A01 — Decide se o perfil entra numa área. ADMIN é o perfil de acesso total (o login do
 * professor usado em aula): compra, vende e administra. Mesmo assim ele só enxerga os PRÓPRIOS
 * pedidos, endereços, cartões e produtos, porque cada serviço filtra pelo userId da sessão.
 */
export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return role === "ADMIN" || allowed.includes(role);
}

/** Perfis que podem comprar (carrinho, checkout, pedidos, endereços e cartões). */
export const canBuy = (role: Role | undefined) => role !== undefined && hasRole(role, ["CUSTOMER"]);
/** Perfis que podem vender (cadastrar produtos e atualizar entregas). */
export const canSell = (role: Role | undefined) => role !== undefined && hasRole(role, ["SELLER"]);
