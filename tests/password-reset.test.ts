import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/mail", async (orig) => ({
  ...(await orig<typeof import("@/lib/mail")>()),
  sendMail: vi.fn(async (to: string, subject: string, text: string) => {
    sent.push({ to, subject, text });
  }),
}));

import { sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { login } from "@/lib/services/auth";
import {
  changePassword,
  requestPasswordReset,
  RESET_INVALID_ERROR,
  RESET_REQUEST_MESSAGE,
  resetPassword,
} from "@/lib/services/password";
import { validateSessionToken } from "@/lib/session";
import { resetDb } from "./helpers/db";
import { createUser, ctx, PASSWORD } from "./helpers/factory";

const NEW_PASSWORD = "Nova-Senha-Bem-Forte-77";

beforeEach(async () => {
  await resetDb();
  sent.length = 0;
});

async function requestAndGetToken(email: string): Promise<string> {
  await requestPasswordReset({ email }, ctx());
  await vi.waitFor(() => expect(sent.length).toBeGreaterThan(0));
  const token = /token=([A-Za-z0-9_-]{43})/.exec(sent.at(-1)!.text)?.[1];
  if (!token) throw new Error("token não encontrado no e-mail");
  return token;
}

describe("recuperação de senha (A07)", () => {
  it("resposta idêntica para e-mail existente e inexistente; só o existente recebe e-mail", async () => {
    const user = await createUser();
    const a = await requestPasswordReset({ email: user.email }, ctx());
    const b = await requestPasswordReset({ email: "nao-existe@teste.local" }, ctx());
    expect(a).toEqual({ ok: true, message: RESET_REQUEST_MESSAGE });
    expect(b).toEqual(a);
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]!.to).toBe(user.email);
  });

  it("guarda só o hash do token, com validade de 15 minutos", async () => {
    const user = await createUser();
    const token = await requestAndGetToken(user.email);
    const row = await db.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.tokenHash).toBe(sha256(token));
    const ttl = row.expiresAt.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(14 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it("redefine, derruba todas as sessões, registra no AuditLog e avisa por e-mail", async () => {
    const user = await createUser();
    const s1 = await login({ email: user.email, password: PASSWORD }, ctx());
    const s2 = await login({ email: user.email, password: PASSWORD }, ctx());
    if (!s1.ok || !s2.ok) throw new Error("login falhou");

    const token = await requestAndGetToken(user.email);
    const res = await resetPassword({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, ctx());
    expect(res.ok).toBe(true);

    expect(await validateSessionToken(s1.token)).toBeNull();
    expect(await validateSessionToken(s2.token)).toBeNull();
    expect(await db.auditLog.count({ where: { action: "PASSWORD_RESET", userId: user.id } })).toBe(1);
    await vi.waitFor(() => expect(sent.some((m) => /senha foi alterada/i.test(m.subject))).toBe(true));

    expect((await login({ email: user.email, password: PASSWORD }, ctx())).ok).toBe(false);
    expect((await login({ email: user.email, password: NEW_PASSWORD }, ctx())).ok).toBe(true);
  });

  it("token reutilizado é rejeitado", async () => {
    const user = await createUser();
    const token = await requestAndGetToken(user.email);
    const input = { token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD };
    expect((await resetPassword(input, ctx())).ok).toBe(true);
    expect(await resetPassword({ ...input, password: "Outra-Senha-Forte-88", confirmPassword: "Outra-Senha-Forte-88" }, ctx()))
      .toEqual({ ok: false, error: RESET_INVALID_ERROR });
  });

  it("token expirado é rejeitado", async () => {
    const user = await createUser();
    const token = await requestAndGetToken(user.email);
    await db.passwordResetToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await resetPassword({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, ctx()))
      .toEqual({ ok: false, error: RESET_INVALID_ERROR });
    expect((await login({ email: user.email, password: PASSWORD }, ctx())).ok).toBe(true);
  });

  it("dois usos simultâneos do mesmo token: só um vence", async () => {
    const user = await createUser();
    const token = await requestAndGetToken(user.email);
    const results = await Promise.all(
      ["Paralela-Senha-Forte-A1", "Paralela-Senha-Forte-B2"].map((p) =>
        resetPassword({ token, password: p, confirmPassword: p }, ctx()),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("pedir de novo invalida o link anterior", async () => {
    const user = await createUser();
    const first = await requestAndGetToken(user.email);
    await requestAndGetToken(user.email);
    expect(await resetPassword({ token: first, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, ctx()))
      .toEqual({ ok: false, error: RESET_INVALID_ERROR });
  });

  it("token inventado é rejeitado e a política de senha vale no reset", async () => {
    const user = await createUser();
    expect(await resetPassword({ token: "a".repeat(43), password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, ctx()))
      .toEqual({ ok: false, error: RESET_INVALID_ERROR });
    const token = await requestAndGetToken(user.email);
    const weak = await resetPassword({ token, password: "curta", confirmPassword: "curta" }, ctx());
    expect(weak.ok).toBe(false);
  });

  it("reset desbloqueia a conta bloqueada por tentativas", async () => {
    const user = await createUser();
    await db.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 600_000) } });
    const token = await requestAndGetToken(user.email);
    await resetPassword({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, ctx());
    expect((await login({ email: user.email, password: NEW_PASSWORD }, ctx())).ok).toBe(true);
  });
});

describe("troca de senha logado", () => {
  it("exige a senha atual e regenera a sessão", async () => {
    const user = await createUser();
    const old = await login({ email: user.email, password: PASSWORD }, ctx());
    if (!old.ok) throw new Error("login falhou");

    const wrong = await changePassword(user.id, { currentPassword: "errada-errada", password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, ctx());
    expect(wrong.ok).toBe(false);

    const res = await changePassword(user.id, { currentPassword: PASSWORD, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(await validateSessionToken(old.token)).toBeNull();
    expect((await validateSessionToken(res.token))?.user.id).toBe(user.id);
  });
});
