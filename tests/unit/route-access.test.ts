import { describe, expect, it } from "vitest";
import { canBuy, canSell, hasRole, requiredRoles } from "@/lib/route-access";

describe("mapa de rotas do middleware (A01)", () => {
  it.each([
    ["/admin", ["ADMIN"]],
    ["/admin/usuarios", ["ADMIN"]],
    ["/ADMIN", ["ADMIN"]],
    ["//admin//", ["ADMIN"]],
    ["/%61dmin", ["ADMIN"]],
    ["/vendedor/produtos", ["SELLER"]],
    ["/conta/pedidos/abc", ["CUSTOMER", "SELLER", "ADMIN"]],
    ["/carrinho", ["CUSTOMER"]],
    ["/checkout/pagamento/abc", ["CUSTOMER"]],
  ])("%s exige %j", (path, roles) => {
    expect(requiredRoles(path)).toEqual(roles);
  });

  it("rotas públicas não exigem login, e prefixo parecido não confunde", () => {
    expect(requiredRoles("/")).toBeNull();
    expect(requiredRoles("/produtos/x")).toBeNull();
    expect(requiredRoles("/administracao-publica")).toBeNull();
  });

  it("caminho mal codificado é tratado como protegido", () => {
    expect(requiredRoles("/%E0%A4%A")).toEqual(["ADMIN"]);
  });
});

describe("hasRole: ADMIN tem acesso total (A01)", () => {
  it("ADMIN entra em todas as áreas", () => {
    for (const roles of [["CUSTOMER"], ["SELLER"], ["ADMIN"], ["CUSTOMER", "SELLER", "ADMIN"]] as const) {
      expect(hasRole("ADMIN", roles)).toBe(true);
    }
    expect(canBuy("ADMIN")).toBe(true);
    expect(canSell("ADMIN")).toBe(true);
  });

  it("cliente e vendedor continuam restritos à própria área", () => {
    expect(hasRole("CUSTOMER", ["ADMIN"])).toBe(false);
    expect(hasRole("CUSTOMER", ["SELLER"])).toBe(false);
    expect(hasRole("SELLER", ["ADMIN"])).toBe(false);
    expect(hasRole("SELLER", ["CUSTOMER"])).toBe(false);
    expect(canBuy("SELLER")).toBe(false);
    expect(canSell("CUSTOMER")).toBe(false);
    expect(canBuy(undefined)).toBe(false);
  });
});
