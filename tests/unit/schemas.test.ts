import { describe, expect, it } from "vitest";
import { addressSchema, cardSchema, cartItemSchema, formToObject, MAX_ITEM_QUANTITY, productSchema, registerSchema } from "@/lib/schemas";
import { generateCpf } from "@/lib/validators";

const PRODUCT_ID = "cmulxlj7f000eigz0kzlq0rlc";

describe("schemas Zod (A05)", () => {
  it("cadastro: normaliza e-mail, CPF e telefone", () => {
    const cpf = generateCpf();
    const res = registerSchema.safeParse({
      name: "  Fulano  ",
      email: "  Fulano@Teste.Local ",
      cpf,
      phone: "(11) 98765-4321",
      password: "Senha-Bem-Forte-123",
      confirmPassword: "Senha-Bem-Forte-123",
    });
    expect(res.success).toBe(true);
    expect(res.data).toMatchObject({ name: "Fulano", email: "fulano@teste.local", phone: "11987654321" });
    expect(res.data?.cpf).toMatch(/^\d{11}$/);
  });

  it("cadastro: rejeita CPF inválido, senhas diferentes e caractere de controle no nome", () => {
    const valid = { name: "Fulano", email: "f@teste.local", cpf: generateCpf(), phone: "11987654321", password: "Senha-Bem-Forte-123", confirmPassword: "Senha-Bem-Forte-123" };
    expect(registerSchema.safeParse({ ...valid, cpf: "111.111.111-11" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, confirmPassword: "outra" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, name: "Fu\u0000lano" }).success).toBe(false);
  });

  it("carrinho: quantidade inteira entre 1 e o limite máximo", () => {
    const parse = (quantity: unknown) => cartItemSchema.safeParse({ productId: PRODUCT_ID, quantity }).success;
    expect(parse("1")).toBe(true);
    expect(parse(MAX_ITEM_QUANTITY)).toBe(true);
    expect(parse(0)).toBe(false);
    expect(parse(-3)).toBe(false);
    expect(parse(1.5)).toBe(false);
    expect(parse(MAX_ITEM_QUANTITY + 1)).toBe(false);
  });

  it("carrinho: id com payload de injeção é rejeitado", () => {
    expect(cartItemSchema.safeParse({ productId: "' OR 1=1--", quantity: 1 }).success).toBe(false);
    expect(cartItemSchema.safeParse({ productId: "<script>alert(1)</script>", quantity: 1 }).success).toBe(false);
  });

  it("cartão: exige Luhn, validade futura e CVV numérico", () => {
    const year = String(new Date().getFullYear() + 2);
    const valid = { number: "4242 4242 4242 4242", holder: "fulano de tal", expMonth: "12", expYear: year, cvv: "123" };
    const ok = cardSchema.safeParse(valid);
    expect(ok.success).toBe(true);
    expect(ok.data).toMatchObject({ number: "4242424242424242", holder: "FULANO DE TAL" });
    expect(cardSchema.safeParse({ ...valid, number: "4242 4242 4242 4241" }).success).toBe(false);
    expect(cardSchema.safeParse({ ...valid, expYear: "2020" }).success).toBe(false);
    expect(cardSchema.safeParse({ ...valid, cvv: "12a" }).success).toBe(false);
  });

  it("endereço: CEP e UF válidos", () => {
    const valid = { label: "Casa", recipient: "Fulano", cep: "01310-100", street: "Rua A", number: "1", district: "Centro", city: "São Paulo", uf: "SP" };
    const ok = addressSchema.safeParse(valid);
    expect(ok.success).toBe(true);
    expect(ok.data).toMatchObject({ cep: "01310100", complement: "" });
    expect(addressSchema.safeParse({ ...valid, cep: "123" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, uf: "XX" }).success).toBe(false);
  });

  it("produto: preço positivo e estoque não negativo", () => {
    const valid = { name: "Fone", description: "Bluetooth", priceCents: "19990", stock: "5" };
    expect(productSchema.safeParse(valid).success).toBe(true);
    expect(productSchema.safeParse({ ...valid, priceCents: "0" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, priceCents: "-100" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, stock: "-1" }).success).toBe(false);
  });

  it("formToObject ignora arquivos e mantém só texto", () => {
    const form = new FormData();
    form.set("name", "Fone");
    form.set("file", new Blob(["x"]), "x.txt");
    expect(formToObject(form)).toEqual({ name: "Fone" });
  });
});
