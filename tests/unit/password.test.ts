import { describe, expect, it } from "vitest";
import { checkPasswordPolicy, hashPassword, PASSWORD_MAX_LENGTH, verifyPassword } from "@/lib/password";

describe("política de senha (A07)", () => {
  it("aceita senha longa e incomum", () => {
    expect(checkPasswordPolicy("Senha-Bem-Forte-123")).toBeNull();
  });

  it("rejeita senha com menos de 12 caracteres", () => {
    expect(checkPasswordPolicy("Curta-123")).toMatch(/pelo menos 12/);
  });

  it("rejeita senha acima do tamanho máximo", () => {
    expect(checkPasswordPolicy("aB3-".repeat(PASSWORD_MAX_LENGTH))).toMatch(/no máximo/);
  });

  it("rejeita senha da lista de senhas comuns, sem diferenciar maiúsculas", () => {
    expect(checkPasswordPolicy("123456789012")).toMatch(/muito comum/);
  });

  it("rejeita um único caractere repetido", () => {
    expect(checkPasswordPolicy("aaaaaaaaaaaaaa")).toMatch(/repetido/);
  });

  it("rejeita senha que contém o e-mail do usuário", () => {
    expect(checkPasswordPolicy("fulano.silva-2026", { email: "Fulano.Silva@teste.local" })).toMatch(/e-mail/);
    expect(checkPasswordPolicy("Senha-Bem-Forte-123", { email: "fulano.silva@teste.local" })).toBeNull();
  });

  describe("composição", () => {
    it("rejeita senha sem número", () => {
      expect(checkPasswordPolicy("Senha-Sem-Numero")).toBe("A senha precisa ter pelo menos 1 número.");
    });

    it("rejeita senha sem letra maiúscula", () => {
      expect(checkPasswordPolicy("senha-sem-maiuscula-7")).toBe("A senha precisa ter pelo menos 1 letra maiúscula.");
    });

    it("rejeita senha sem letra minúscula", () => {
      expect(checkPasswordPolicy("SENHA-SEM-MINUSCULA-7")).toBe("A senha precisa ter pelo menos 1 letra minúscula.");
    });

    it("rejeita senha sem símbolo", () => {
      expect(checkPasswordPolicy("SenhaSemSimbolo7")).toMatch(/^A senha precisa ter pelo menos 1 símbolo/);
    });

    it("lista tudo o que falta numa mensagem só", () => {
      expect(checkPasswordPolicy("senhasomenteminuscula")).toMatch(
        /^A senha precisa ter pelo menos 1 número, 1 letra maiúscula e 1 símbolo/,
      );
    });

    it("aceita espaço como símbolo", () => {
      expect(checkPasswordPolicy("Minha senha forte 7")).toBeNull();
    });

    it.each(["-", ",", "<", ">"])("aceita %s como símbolo", (s) => {
      expect(checkPasswordPolicy(`MinhaSenhaForte7${s}`)).toBeNull();
    });
  });
});

describe("hash de senha (A07)", () => {
  it("gera Argon2id com os parâmetros exigidos e sal aleatório", async () => {
    const a = await hashPassword("Senha-Bem-Forte-123");
    const b = await hashPassword("Senha-Bem-Forte-123");
    expect(a).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(a).not.toBe(b);
  });

  it("confere a senha certa e nega a errada", async () => {
    const stored = await hashPassword("Senha-Bem-Forte-123");
    expect(await verifyPassword(stored, "Senha-Bem-Forte-123")).toBe(true);
    expect(await verifyPassword(stored, "Senha-Bem-Forte-124")).toBe(false);
  });

  it("hash corrompido nega o acesso em vez de lançar erro", async () => {
    expect(await verifyPassword("isto-não-é-um-hash", "qualquer")).toBe(false);
  });
});
