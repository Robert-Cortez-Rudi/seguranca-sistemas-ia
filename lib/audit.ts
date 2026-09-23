import "server-only";
import type { AuditAction, Prisma } from "@prisma/client";
import { db } from "./db";
import type { RequestContext } from "./request";

// A09 — Chaves que nunca podem aparecer no metadata do AuditLog.
const FORBIDDEN_KEYS = /pass|senha|token|secret|cpf|card|cart|cvv|number|totp|code/i;

function sanitize(metadata: Record<string, unknown>): Prisma.InputJsonObject {
  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (FORBIDDEN_KEYS.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

/** Registra um evento. Falha no log não derruba a operação, mas vai para o log do servidor. */
export async function audit(
  action: AuditAction,
  ctx: RequestContext,
  opts: { userId?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        userId: opts.userId ?? null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: opts.metadata ? sanitize(opts.metadata) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao gravar", action, err);
  }
}
