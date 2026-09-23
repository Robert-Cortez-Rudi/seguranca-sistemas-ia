import "server-only";
import { randomInt } from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { audit } from "../audit";
import { decrypt, encrypt, sha256 } from "../crypto";
import { db } from "../db";
import { verifyPassword } from "../password";
import type { RequestContext } from "../request";
import { recoveryCodeSchema, totpCodeSchema } from "../schemas";
import { createSession, validateSessionToken } from "../session";
import { registerFailedLogin } from "./auth";

// A07 — 2FA TOTP opcional (RFC 6238) com códigos de recuperação de uso único.

export const MFA_MAX_ATTEMPTS = 5;
export const MFA_ERROR = "Código inválido.";
export const MFA_EXPIRED_ERROR = "A verificação expirou. Entre novamente.";
const RECOVERY_CODE_COUNT = 10;
// Sem 0/O e 1/I/L para evitar confusão ao digitar. 32 símbolos × 10 = 50 bits por código.
const RECOVERY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const TOTP_CONTEXT = "user.totp";

/** Aceita o passo atual e o anterior (30 s de tolerância de relógio), nunca um passo já usado. */
async function checkTotp(secret: string, code: string, lastStep: number | null) {
  const result = await verify({
    secret,
    token: code,
    epochTolerance: [30, 0],
    ...(lastStep !== null ? { afterTimeStep: lastStep } : {}),
  });
  // O tipo de retorno une HOTP e TOTP; só o de TOTP traz timeStep.
  return result.valid && "timeStep" in result ? result.timeStep : null;
}

function newRecoveryCode(): string {
  const pick = () => Array.from({ length: 5 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join("");
  return `${pick()}-${pick()}`;
}

/** Passo 1 do cadastro: gera o segredo (ainda desativado) e o QR code. */
export async function startEnrollment(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, totpEnabled: true } });
  if (user.totpEnabled) return { ok: false as const, error: "A verificação em duas etapas já está ativa." };
  const secret = generateSecret();
  await db.user.update({ where: { id: userId }, data: { totpSecretEnc: encrypt(secret, TOTP_CONTEXT), totpLastStep: null } });
  const uri = generateURI({ issuer: "SecureShop", label: user.email, secret });
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  return { ok: true as const, secret, qrDataUrl };
}

/** Passo 2: o usuário prova que configurou o app. Só então o 2FA liga e os códigos são gerados. */
export async function confirmEnrollment(userId: string, input: unknown, ctx: RequestContext) {
  const parsed = totpCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: MFA_ERROR };
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totpSecretEnc: true, totpEnabled: true } });
  if (user.totpEnabled || !user.totpSecretEnc) return { ok: false as const, error: "Comece a configuração novamente." };

  const step = await checkTotp(decrypt(user.totpSecretEnc, TOTP_CONTEXT), parsed.data.code, null);
  if (step === null) return { ok: false as const, error: MFA_ERROR };

  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { totpEnabled: true, totpLastStep: step } }),
    db.recoveryCode.deleteMany({ where: { userId } }),
    db.recoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: sha256(c) })) }),
  ]);
  await audit("MFA_ENABLED", ctx, { userId });
  return { ok: true as const, recoveryCodes: codes }; // exibidos uma única vez
}

/** Desligar exige senha atual e um código válido. */
export async function disableMfa(userId: string, input: { password?: string; code?: string }, ctx: RequestContext) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true, totpSecretEnc: true, totpEnabled: true, totpLastStep: true },
  });
  if (!user.totpEnabled || !user.totpSecretEnc) return { ok: false as const, error: "A verificação em duas etapas não está ativa." };
  const code = totpCodeSchema.safeParse({ code: input.code });
  const passwordOk = await verifyPassword(user.passwordHash, String(input.password ?? "").slice(0, 128));
  const step = code.success ? await checkTotp(decrypt(user.totpSecretEnc, TOTP_CONTEXT), code.data.code, user.totpLastStep) : null;
  if (!passwordOk || step === null) return { ok: false as const, error: "Senha ou código inválido." };

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecretEnc: null, totpLastStep: null } }),
    db.recoveryCode.deleteMany({ where: { userId } }),
  ]);
  await audit("MFA_DISABLED", ctx, { userId });
  return { ok: true as const };
}

export type MfaLoginResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; error: string; restart?: boolean };

/**
 * Segunda etapa do login. Recebe o token da sessão provisória (mfaPending) e um
 * código TOTP ou de recuperação. Após 5 erros a sessão provisória é apagada.
 */
export async function verifyMfaLogin(
  pendingToken: string | undefined,
  input: { code?: string; kind?: string },
  ctx: RequestContext,
): Promise<MfaLoginResult> {
  const session = await validateSessionToken(pendingToken);
  if (!session || !session.mfaPending) return { ok: false, error: MFA_EXPIRED_ERROR, restart: true };
  const userId = session.user.id;

  // Conta bloqueada durante a verificação (por erros de código em outra aba, por exemplo).
  const lock = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { lockedUntil: true } });
  if (lock.lockedUntil && lock.lockedUntil > new Date()) {
    await db.session.deleteMany({ where: { id: session.sessionId } });
    return { ok: false, error: MFA_EXPIRED_ERROR, restart: true };
  }

  let accepted = false;
  if (input.kind === "recovery") {
    const parsed = recoveryCodeSchema.safeParse({ code: input.code });
    if (parsed.success) {
      // updateMany condicional: o mesmo código não é aceito duas vezes, nem em paralelo.
      const used = await db.recoveryCode.updateMany({
        where: { userId, codeHash: sha256(parsed.data.code), usedAt: null },
        data: { usedAt: new Date() },
      });
      accepted = used.count === 1;
    }
  } else {
    const parsed = totpCodeSchema.safeParse({ code: input.code });
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totpSecretEnc: true, totpLastStep: true } });
    if (parsed.success && user.totpSecretEnc) {
      const step = await checkTotp(decrypt(user.totpSecretEnc, TOTP_CONTEXT), parsed.data.code, user.totpLastStep);
      if (step !== null) {
        // Grava o passo só se ele for novo: o mesmo código em duas abas não entra duas vezes.
        const claim = await db.user.updateMany({
          where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
          data: { totpLastStep: step },
        });
        accepted = claim.count === 1;
      }
    }
  }

  if (!accepted) {
    const updated = await db.session.update({
      where: { id: session.sessionId },
      data: { mfaAttempts: { increment: 1 } },
      select: { mfaAttempts: true },
    });
    // Conta também no bloqueio da conta (compartilhado com as falhas de senha).
    const locked = await registerFailedLogin(userId, ctx, "mfa");
    if (locked || updated.mfaAttempts >= MFA_MAX_ATTEMPTS) {
      await db.session.deleteMany({ where: { id: session.sessionId } });
      return { ok: false, error: MFA_EXPIRED_ERROR, restart: true };
    }
    return { ok: false, error: MFA_ERROR };
  }

  // Sessão provisória morre; nasce uma sessão completa com token novo.
  // deleteMany + count: duas requisições com a mesma sessão provisória não geram duas sessões.
  const consumed = await db.session.deleteMany({ where: { id: session.sessionId } });
  if (consumed.count !== 1) return { ok: false, error: MFA_EXPIRED_ERROR, restart: true };
  await db.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
  const full = await createSession(userId, ctx);
  await audit("LOGIN_OK", ctx, { userId, metadata: { mfa: input.kind === "recovery" ? "recovery" : "totp" } });
  return { ok: true, ...full };
}

export async function remainingRecoveryCodes(userId: string): Promise<number> {
  return db.recoveryCode.count({ where: { userId, usedAt: null } });
}
