import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, swatchClass } from "@/lib/format";

// O Intl usa espaço não separável entre "R$" e o valor.
const plain = (s: string) => s.replace(/\s/g, " ");

describe("formatação", () => {
  it("dinheiro: centavos viram reais em pt-BR", () => {
    expect(plain(formatMoney(19990))).toBe("R$ 199,90");
    expect(plain(formatMoney(0))).toBe("R$ 0,00");
    expect(plain(formatMoney(123456789))).toBe("R$ 1.234.567,89");
  });

  it("data: sempre no fuso de São Paulo, independente do servidor", () => {
    expect(plain(formatDate(new Date("2026-10-05T15:30:00Z")))).toBe("05/10/2026, 12:30");
  });

  it("cor do produto: estável por id e sempre uma das 5 classes", () => {
    expect(swatchClass("cmulxlj7f000eigz0kzlq0rlc")).toBe(swatchClass("cmulxlj7f000eigz0kzlq0rlc"));
    for (const id of ["a", "abc", "cmulxlj7f000eigz0kzlq0rlc", ""]) {
      expect(swatchClass(id)).toMatch(/^swatch-[0-4]$/);
    }
  });
});
