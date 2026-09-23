// A01/A02 — Proteção CSRF para rotas de API (as Server Actions já têm a checagem do Next).
// Requisição que muda estado precisa vir da própria aplicação. Sem Origin/Referer: nega.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Chamadas servidor-a-servidor autenticadas por assinatura, não por cookie.
const ORIGIN_EXEMPT = ["/api/webhooks/"];

export function isCrossSiteApiRequest(opts: {
  method: string;
  pathname: string;
  origin: string | null;
  referer: string | null;
  appUrl: string | undefined;
}): boolean {
  if (!opts.pathname.startsWith("/api/")) return false;
  if (SAFE_METHODS.has(opts.method.toUpperCase())) return false;
  if (ORIGIN_EXEMPT.some((p) => opts.pathname.startsWith(p))) return false;
  if (!opts.appUrl) return true; // sem APP_URL configurado não há como comparar: fail closed

  const expected = new URL(opts.appUrl).origin;
  const source = opts.origin ?? (opts.referer ? safeOrigin(opts.referer) : null);
  return source !== expected;
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
