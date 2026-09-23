import { afterEach, describe, expect, it } from "vitest";
import { blindIndex, decrypt, encrypt, safeEqualHex, sha256 } from "@/lib/crypto";

describe("lib/crypto (A04)", () => {
  const originalKey = process.env.ENCRYPTION_KEY;
  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("cifra e decifra ida e volta", () => {
    const enc = encrypt("123.456.789-09", "user.cpf");
    expect(enc).not.toContain("123");
    expect(decrypt(enc, "user.cpf")).toBe("123.456.789-09");
  });

  it("usa IV aleatório: o mesmo texto gera cifras diferentes", () => {
    expect(encrypt("x", "c")).not.toBe(encrypt("x", "c"));
  });

  it("rejeita cifra adulterada (tag GCM)", () => {
    const [v, iv, tag, ct] = encrypt("segredo", "c").split(":");
    const flipped = Buffer.from(ct!, "base64url");
    flipped[0] = flipped[0]! ^ 0xff;
    expect(() => decrypt([v, iv, tag, flipped.toString("base64url")].join(":"), "c")).toThrow();
  });

  it("rejeita cifra copiada para outro contexto (AAD)", () => {
    const enc = encrypt("11987654321", "user.phone");
    expect(() => decrypt(enc, "user.cpf")).toThrow();
  });

  it("falha fechado sem chave válida", () => {
    process.env.ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    expect(() => encrypt("x", "c")).toThrow(/ENCRYPTION_KEY/);
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x", "c")).toThrow(/ENCRYPTION_KEY/);
  });

  it("blind index é determinístico e não revela o valor", () => {
    expect(blindIndex("12345678909")).toBe(blindIndex("12345678909"));
    expect(blindIndex("12345678909")).not.toBe(blindIndex("12345678901"));
    expect(blindIndex("12345678909")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("safeEqualHex compara assinaturas sem aceitar vazio ou tamanhos diferentes", () => {
    const h = sha256("a");
    expect(safeEqualHex(h, h)).toBe(true);
    expect(safeEqualHex(h, sha256("b"))).toBe(false);
    expect(safeEqualHex("", "")).toBe(false);
    expect(safeEqualHex(h, h.slice(0, 10))).toBe(false);
  });
});
