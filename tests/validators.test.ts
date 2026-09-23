import { describe, expect, it } from "vitest";
import { cardBrand, generateCpf, isValidCep, isValidCpf, isValidLuhn } from "@/lib/validators";
import { maskCard, maskCpf, maskPhone } from "@/lib/mask";

describe("validadores (A05)", () => {
  it("CPF: aceita dígitos verificadores corretos, com ou sem máscara", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("CPF: rejeita dígito errado, sequência repetida e tamanho errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("' OR 1=1--")).toBe(false);
  });

  it("CPF gerado para o seed é sempre válido", () => {
    for (let i = 0; i < 200; i++) expect(isValidCpf(generateCpf())).toBe(true);
  });

  it("CEP", () => {
    expect(isValidCep("01310-100")).toBe(true);
    expect(isValidCep("01310100")).toBe(true);
    expect(isValidCep("0131010")).toBe(false);
    expect(isValidCep("01310-10a")).toBe(false);
  });

  it("Luhn", () => {
    expect(isValidLuhn("4242 4242 4242 4242")).toBe(true);
    expect(isValidLuhn("4242 4242 4242 4241")).toBe(false);
    expect(isValidLuhn("1234")).toBe(false);
  });

  it("bandeira", () => {
    expect(cardBrand("4242424242424242")).toBe("VISA");
    expect(cardBrand("5555555555554444")).toBe("MASTERCARD");
  });
});

describe("máscaras (A04)", () => {
  it("CPF no formato ***.456.789-**", () => {
    expect(maskCpf("123.456.789-09")).toBe("***.456.789-**");
  });
  it("cartão mostra só os 4 últimos", () => {
    expect(maskCard("4242")).toBe("**** 4242");
  });
  it("telefone", () => {
    expect(maskPhone("11987654321")).toBe("(11) *****-4321");
  });
});
