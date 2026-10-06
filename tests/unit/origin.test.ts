import { describe, expect, it } from "vitest";
import { isCrossSiteApiRequest } from "@/lib/origin";

describe("CSRF em rotas de API (A01/A02)", () => {
  const base = { pathname: "/api/qualquer", appUrl: "http://localhost:3000", referer: null };

  it("POST de outra origem ou sem origem é bloqueado", () => {
    expect(isCrossSiteApiRequest({ ...base, method: "POST", origin: "https://evil.example" })).toBe(true);
    expect(isCrossSiteApiRequest({ ...base, method: "POST", origin: null })).toBe(true);
  });

  it("POST da própria origem passa; GET não é afetado", () => {
    expect(isCrossSiteApiRequest({ ...base, method: "POST", origin: "http://localhost:3000" })).toBe(false);
    expect(isCrossSiteApiRequest({ ...base, method: "GET", origin: "https://evil.example" })).toBe(false);
  });

  it("webhook é isento (autenticado por HMAC)", () => {
    expect(isCrossSiteApiRequest({ ...base, pathname: "/api/webhooks/pagamento", method: "POST", origin: null })).toBe(false);
  });

  it("sem Origin, vale o Referer; Referer inválido é bloqueado", () => {
    expect(isCrossSiteApiRequest({ ...base, method: "POST", origin: null, referer: "http://localhost:3000/carrinho" })).toBe(false);
    expect(isCrossSiteApiRequest({ ...base, method: "POST", origin: null, referer: "https://evil.example/x" })).toBe(true);
    expect(isCrossSiteApiRequest({ ...base, method: "POST", origin: null, referer: "isto não é url" })).toBe(true);
  });

  it("sem APP_URL configurado nega por padrão (fail closed)", () => {
    expect(isCrossSiteApiRequest({ ...base, appUrl: undefined, method: "POST", origin: "http://localhost:3000" })).toBe(true);
  });

  it("páginas fora de /api não passam por esta checagem", () => {
    expect(isCrossSiteApiRequest({ ...base, pathname: "/carrinho", method: "POST", origin: "https://evil.example" })).toBe(false);
  });
});
