import { describe, expect, it } from "vitest";
import { requiredRoles } from "@/lib/route-access";

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
