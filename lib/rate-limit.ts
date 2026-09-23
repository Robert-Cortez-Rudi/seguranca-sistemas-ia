import "server-only";
import { db } from "./db";

export const AUTH_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 } as const;

/**
 * A07 — Janela fixa guardada no Postgres. O INSERT ... ON CONFLICT é atômico,
 * então requisições simultâneas não escapam do contador.
 * Retorna true se a requisição pode seguir.
 */
export async function consumeRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number } = AUTH_RATE_LIMIT,
): Promise<boolean> {
  const now = new Date();
  const windowStartMin = new Date(now.getTime() - windowMs);
  // $queryRaw com template é parametrizado pelo Prisma (não é o $queryRawUnsafe proibido).
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count"       = CASE WHEN "RateLimit"."windowStart" < ${windowStartMin} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${windowStartMin} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  const count = rows[0]?.count;
  return typeof count === "number" && count <= limit; // sem resposta do banco: nega (fail closed)
}
