import { beforeEach, describe, expect, it } from "vitest";
import { sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { LOGIN_ERROR, login, RATE_LIMIT_ERROR, register, REGISTER_CONFLICT_ERROR } from "@/lib/services/auth";
import { validateSessionToken } from "@/lib/session";
import { generateCpf } from "@/lib/validators";
import { resetDb } from "./helpers/db";
import { createUser, ctx, PASSWORD } from "./helpers/factory";

beforeEach(resetDb);

describe("login (A07)", () => {
  it("entra com a senha correta e grava só o hash do token", async () => {
    const user = await createUser();
    const res = await login({ email: user.email, password: PASSWORD }, ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.token).toHaveLength(43); // 32 bytes em base64url

    const stored = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).toBe(sha256(res.token));
    expect(stored.tokenHash).not.toBe(res.token);
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(7.9 * 3600 * 1000);

    const session = await validateSessionToken(res.token);
    expect(session?.user.id).toBe(user.id);
    expect(await db.auditLog.count({ where: { action: "LOGIN_OK", userId: user.id } })).toBe(1);
  });

  it("a mesma mensagem para e-mail inexistente e senha errada", async () => {
    const user = await createUser();
    const wrongPass = await login({ email: user.email, password: "outra-senha-qualquer" }, ctx());
    const noUser = await login({ email: "ninguem@teste.local", password: "outra-senha-qualquer" }, ctx());
    expect(wrongPass).toEqual({ ok: false, error: LOGIN_ERROR });
    expect(noUser).toEqual({ ok: false, error: LOGIN_ERROR });
  });

  it("brute force: a 6ª tentativa é bloqueada mesmo com a senha correta", async () => {
    const user = await createUser();
    const c = ctx();
    for (let i = 0; i < 5; i++) {
      expect((await login({ email: user.email, password: `errada-${i}-xxxxxxxx` }, c)).ok).toBe(false);
    }
    const sixth = await login({ email: user.email, password: PASSWORD }, c);
    expect(sixth).toEqual({ ok: false, error: LOGIN_ERROR });

    const locked = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(locked.lockedUntil!.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
    expect(await db.auditLog.count({ where: { action: "LOCKOUT", userId: user.id } })).toBe(1);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("o bloqueio termina após 15 minutos", async () => {
    const user = await createUser();
    await db.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect((await login({ email: user.email, password: PASSWORD }, ctx())).ok).toBe(true);
  });

  it("rate limit por IP: a 11ª requisição em 15 min é recusada", async () => {
    const c = ctx("192.168.99.1");
    for (let i = 0; i < 10; i++) {
      const r = await login({ email: `x${i}@teste.local`, password: "qualquer-coisa-aqui" }, c);
      expect(r).toEqual({ ok: false, error: LOGIN_ERROR });
    }
    expect(await login({ email: "y@teste.local", password: "qualquer" }, c)).toEqual({ ok: false, error: RATE_LIMIT_ERROR });
    // Outro IP continua liberado.
    expect(await login({ email: "y@teste.local", password: "qualquer" }, ctx())).toEqual({ ok: false, error: LOGIN_ERROR });
  });

  it("payload de SQL injection no e-mail não autentica", async () => {
    await createUser();
    const r = await login({ email: "' OR 1=1--", password: "' OR 1=1--" }, ctx());
    expect(r).toEqual({ ok: false, error: LOGIN_ERROR });
    expect(await db.session.count()).toBe(0);
  });

  it("usuário desativado não entra", async () => {
    const user = await createUser();
    await db.user.update({ where: { id: user.id }, data: { active: false } });
    expect(await login({ email: user.email, password: PASSWORD }, ctx())).toEqual({ ok: false, error: LOGIN_ERROR });
  });

  it("sessão expirada é recusada e apagada", async () => {
    const user = await createUser();
    const res = await login({ email: user.email, password: PASSWORD }, ctx());
    if (!res.ok) throw new Error("login falhou");
    await db.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    expect(await validateSessionToken(res.token)).toBeNull();
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("cadastro (A07)", () => {
  const valid = () => ({
    name: "Maria Teste",
    email: `maria${Math.random().toString(36).slice(2, 8)}@teste.local`,
    cpf: generateCpf(),
    phone: "(11) 98765-4321",
    password: "Uma-Senha-Bem-Longa-9",
    confirmPassword: "Uma-Senha-Bem-Longa-9",
  });

  it("cria cliente com CPF e telefone cifrados", async () => {
    const input = valid();
    const res = await register(input, ctx());
    expect(res.ok).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(user.role).toBe("CUSTOMER");
    expect(user.cpfEnc).not.toContain(input.cpf);
    expect(user.cpfHash).toMatch(/^[0-9a-f]{64}$/);
    expect(user.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it("ignora tentativa de escolher o perfil (mass assignment)", async () => {
    const input = { ...valid(), role: "ADMIN" };
    await register(input, ctx());
    const user = await db.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(user.role).toBe("CUSTOMER");
  });

  it("rejeita senha curta e senha comum", async () => {
    const short = await register({ ...valid(), password: "Curta-1", confirmPassword: "Curta-1" }, ctx());
    expect(short.ok).toBe(false);
    const common = await register({ ...valid(), password: "password1234", confirmPassword: "password1234" }, ctx());
    expect(common).toMatchObject({ ok: false, error: expect.stringMatching(/comum/) });
  });

  it("rejeita CPF com dígito verificador errado", async () => {
    const res = await register({ ...valid(), cpf: "529.982.247-24" }, ctx());
    expect(res).toMatchObject({ ok: false, fieldErrors: { cpf: ["CPF inválido."] } });
  });

  it("e-mail ou CPF repetido recebem a mesma mensagem genérica", async () => {
    const first = valid();
    await register(first, ctx());
    const sameEmail = await register({ ...valid(), email: first.email }, ctx());
    const sameCpf = await register({ ...valid(), cpf: first.cpf }, ctx());
    expect(sameEmail).toEqual({ ok: false, error: REGISTER_CONFLICT_ERROR });
    expect(sameCpf).toEqual({ ok: false, error: REGISTER_CONFLICT_ERROR });
  });

  it("nome com <script> é gravado como texto, sem execução", async () => {
    const input = { ...valid(), name: "<script>alert(1)</script>" };
    expect((await register(input, ctx())).ok).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(user.name).toBe("<script>alert(1)</script>"); // o React escapa na renderização
  });
});

describe("AuditLog (A09)", () => {
  it("nunca grava a senha digitada", async () => {
    const user = await createUser();
    await login({ email: user.email, password: "Senha-Vazada-Errada-123" }, ctx());
    const logs = await db.auditLog.findMany();
    expect(JSON.stringify(logs)).not.toContain("Senha-Vazada-Errada-123");
  });
});
