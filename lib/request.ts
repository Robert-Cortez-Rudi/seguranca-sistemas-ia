import "server-only";
import { headers } from "next/headers";

export type RequestContext = { ip: string; userAgent: string };

/**
 * IP e user agent da requisição atual. O X-Forwarded-For já foi reescrito pelo
 * server.mjs com um valor confiável, então aqui ele não vem do cliente.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido",
    userAgent: (h.get("user-agent") ?? "").slice(0, 300),
  };
}
