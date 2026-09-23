import { describe, expect, it } from "vitest";
import { buildCsp, generateNonce } from "@/lib/csp";

describe("CSP (A02)", () => {
  it("gera nonce diferente a cada chamada, com 16 bytes", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, "base64")).toHaveLength(16);
  });

  it("em produção não permite unsafe-inline nem unsafe-eval em scripts", () => {
    const csp = buildCsp("abc", false);
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scriptSrc).toContain("'nonce-abc'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("bloqueia framing, plugins e troca de base", () => {
    const csp = buildCsp("abc", false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });
});
