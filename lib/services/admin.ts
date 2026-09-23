import "server-only";
import { AuditAction, type Prisma } from "@prisma/client";
import { z } from "zod";
import { audit } from "../audit";
import { db } from "../db";
import type { RequestContext } from "../request";
import { idSchema } from "../schemas";
import { deleteAllUserSessions } from "../session";

// A01/A09 — Funções do ADMIN: ler o AuditLog e gerenciar usuários.
// A listagem de usuários não traz CPF, telefone nem hash de senha (select explícito).

export const AUDIT_PAGE_SIZE = 50;

export async function listAuditLogs(opts: { action?: string; page?: number }) {
  const actions = Object.values(AuditAction) as string[];
  const action = opts.action && actions.includes(opts.action) ? (opts.action as AuditAction) : undefined;
  const requested = Math.floor(Number(opts.page));
  const page = Number.isFinite(requested) ? Math.max(1, Math.min(1000, requested)) : 1;
  const where: Prisma.AuditLogWhereInput = action ? { action } : {};
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: { id: true, action: true, ip: true, userAgent: true, metadata: true, createdAt: true, user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)), actions, action };
}

export async function listUsers() {
  return db.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, lockedUntil: true, totpEnabled: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

const userUpdateSchema = z.object({
  userId: idSchema,
  intent: z.enum(["deactivate", "activate", "unlock", "role"]),
  role: z.enum(["CUSTOMER", "SELLER", "ADMIN"]).optional(),
});

export async function updateUser(adminId: string, input: unknown, ctx: RequestContext): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { userId, intent, role } = parsed.data;
  // Evita que o admin se tranque para fora ou perca o próprio perfil por engano.
  if (userId === adminId) return { ok: false, error: "Você não pode alterar a própria conta por aqui." };

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { ok: false, error: "Usuário não encontrado." };

  if (intent === "deactivate") {
    await db.user.update({ where: { id: userId }, data: { active: false } });
    await deleteAllUserSessions(userId); // desativar derruba as sessões na hora
  } else if (intent === "activate") {
    await db.user.update({ where: { id: userId }, data: { active: true } });
  } else if (intent === "unlock") {
    await db.user.update({ where: { id: userId }, data: { lockedUntil: null, failedLoginCount: 0 } });
  } else {
    if (!role) return { ok: false, error: "Escolha o perfil." };
    await db.user.update({ where: { id: userId }, data: { role } });
    await deleteAllUserSessions(userId); // perfil novo exige login novo
  }
  await audit("USER_UPDATED", ctx, { userId: adminId, metadata: { target: userId, intent, role: role ?? "" } });
  return { ok: true };
}
