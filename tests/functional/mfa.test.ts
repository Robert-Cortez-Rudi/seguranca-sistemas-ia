import { generate } from "otplib";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { LOGIN_ERROR, login } from "@/lib/services/auth";
import { confirmEnrollment, disableMfa, MFA_ERROR, MFA_EXPIRED_ERROR, startEnrollment, verifyMfaLogin } from "@/lib/services/mfa";
import { validateSessionToken } from "@/lib/session";
import { resetDb } from "../helpers/db";
import { createUser, ctx, PASSWORD } from "../helpers/factory";

beforeEach(resetDb);

/** Cria usuário com 2FA ativo e devolve o segredo e os códigos de recuperação. */
async function userWithMfa() {
  const user = await createUser();
  const start = await startEnrollment(user.id);
  if (!start.ok) throw new Error(start.error);
  const done = await confirmEnrollment(user.id, { code: await generate({ secret: start.secret }) }, ctx());
  if (!done.ok) throw new Error(done.error);
  // Libera o passo atual para os testes (a confirmação já o consumiu).
  await db.user.update({ where: { id: user.id }, data: { totpLastStep: 0 } });
  return { user, secret: start.secret, recoveryCodes: done.recoveryCodes };
}

async function pendingLogin(email: string) {
  const res = await login({ email, password: PASSWORD }, ctx());
  if (!res.ok || !res.mfaRequired) throw new Error("esperava etapa de 2FA");
  return res.token;
}

describe("2FA TOTP (A07)", () => {
  it("cadastro: segredo cifrado, 2FA só liga após código válido, 10 códigos com hash", async () => {
    const user = await createUser();
    const start = await startEnrollment(user.id);
    if (!start.ok) throw new Error();
    expect(start.qrDataUrl).toMatch(/^data:image\/png;base64,/);

    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.totpEnabled).toBe(false);
    expect(row.totpSecretEnc).not.toContain(start.secret);

    expect(await confirmEnrollment(user.id, { code: "000000" }, ctx())).toEqual({ ok: false, error: MFA_ERROR });
    const done = await confirmEnrollment(user.id, { code: await generate({ secret: start.secret }) }, ctx());
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.recoveryCodes).toHaveLength(10);
    const stored = await db.recoveryCode.findMany({ where: { userId: user.id } });
    expect(stored.map((c) => c.codeHash)).not.toContain(done.recoveryCodes[0]);
  });

  it("login com 2FA: a sessão provisória não dá acesso; o código correto gera sessão nova", async () => {
    const { user, secret } = await userWithMfa();
    const pending = await pendingLogin(user.email);
    expect((await validateSessionToken(pending))?.mfaPending).toBe(true);

    const res = await verifyMfaLogin(pending, { code: await generate({ secret }) }, ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.token).not.toBe(pending);
    expect(await validateSessionToken(pending)).toBeNull();
    expect((await validateSessionToken(res.token))?.mfaPending).toBe(false);
  });

  it("replay: o mesmo código TOTP não entra duas vezes", async () => {
    const { user, secret } = await userWithMfa();
    const code = await generate({ secret });
    expect((await verifyMfaLogin(await pendingLogin(user.email), { code }, ctx())).ok).toBe(true);
    expect(await verifyMfaLogin(await pendingLogin(user.email), { code }, ctx())).toEqual({ ok: false, error: MFA_ERROR });
  });

  it("código de recuperação funciona uma única vez", async () => {
    const { user, recoveryCodes } = await userWithMfa();
    const code = recoveryCodes[0]!.toLowerCase(); // aceita minúsculas
    expect((await verifyMfaLogin(await pendingLogin(user.email), { code, kind: "recovery" }, ctx())).ok).toBe(true);
    expect(await verifyMfaLogin(await pendingLogin(user.email), { code, kind: "recovery" }, ctx()))
      .toEqual({ ok: false, error: MFA_ERROR });
  });

  it("erros de código contam para o bloqueio da conta: 5 erros bloqueiam", async () => {
    const { user, secret } = await userWithMfa();
    let pending = await pendingLogin(user.email);
    for (let i = 0; i < 4; i++) {
      expect(await verifyMfaLogin(pending, { code: "000000" }, ctx())).toEqual({ ok: false, error: MFA_ERROR });
    }
    expect(await verifyMfaLogin(pending, { code: "000000" }, ctx())).toMatchObject({ ok: false, restart: true });

    // Conta bloqueada: nem senha certa, nem código certo.
    expect(await login({ email: user.email, password: PASSWORD }, ctx())).toEqual({ ok: false, error: LOGIN_ERROR });
    pending = "x";
    expect(await verifyMfaLogin(pending, { code: await generate({ secret }) }, ctx()))
      .toEqual({ ok: false, error: MFA_EXPIRED_ERROR, restart: true });
    expect(await db.auditLog.count({ where: { action: "LOCKOUT", userId: user.id } })).toBe(1);
  });

  it("senha certa não zera o contador enquanto o 2FA não for concluído", async () => {
    const { user } = await userWithMfa();
    for (let i = 0; i < 5; i++) {
      await verifyMfaLogin(await pendingLogin(user.email), { code: "000000" }, ctx());
    }
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("token de sessão completa não serve como sessão provisória", async () => {
    const user = await createUser();
    const res = await login({ email: user.email, password: PASSWORD }, ctx());
    if (!res.ok) throw new Error();
    expect(await verifyMfaLogin(res.token, { code: "123456" }, ctx())).toMatchObject({ ok: false, restart: true });
  });

  it("desligar exige senha e código", async () => {
    const { user, secret } = await userWithMfa();
    expect((await disableMfa(user.id, { password: "errada", code: await generate({ secret }) }, ctx())).ok).toBe(false);
    expect((await disableMfa(user.id, { password: PASSWORD, code: "000000" }, ctx())).ok).toBe(false);
    expect((await disableMfa(user.id, { password: PASSWORD, code: await generate({ secret }) }, ctx())).ok).toBe(true);
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.totpEnabled).toBe(false);
    expect(row.totpSecretEnc).toBeNull();
    expect(await db.recoveryCode.count({ where: { userId: user.id } })).toBe(0);
  });
});
