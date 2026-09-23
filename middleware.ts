import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { buildCsp, generateNonce } from "@/lib/csp";
import { isCrossSiteApiRequest } from "@/lib/origin";
import { requiredRoles } from "@/lib/route-access";
import { validateSessionToken } from "@/lib/session";

// Roda em Node (estável no Next 15.5) para poder consultar a sessão no banco.
// O cookie sozinho não prova nada: a sessão é validada contra a tabela Session.
const SESSION_COOKIE = "__Host-ss_session";

function withCsp(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export async function middleware(request: NextRequest) {
  // A02 — CSP com nonce por requisição.
  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // A01/A02 — CSRF em rotas de API: método que altera estado precisa vir da própria origem.
  if (
    isCrossSiteApiRequest({
      method: request.method,
      pathname: request.nextUrl.pathname,
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      appUrl: process.env.APP_URL,
    })
  ) {
    return withCsp(NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }), csp);
  }

  // A01 — /conta, /vendedor, /admin, /carrinho e /checkout exigem sessão e perfil.
  const roles = requiredRoles(request.nextUrl.pathname);
  if (roles) {
    let session = null;
    try {
      session = await validateSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    } catch (err) {
      // Fail closed: se o banco não responde, ninguém entra na área protegida.
      console.error("[middleware] falha ao validar sessão", err);
      return withCsp(new NextResponse("Serviço indisponível.", { status: 503 }), csp);
    }

    if (!session || session.mfaPending) {
      const login = new URL("/entrar", request.url);
      login.searchParams.set("next", request.nextUrl.pathname);
      return withCsp(NextResponse.redirect(login), csp);
    }

    if (!roles.includes(session.user.role)) {
      await audit(
        "ACCESS_DENIED",
        {
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido",
          userAgent: (request.headers.get("user-agent") ?? "").slice(0, 300),
        },
        { userId: session.user.id, metadata: { path: request.nextUrl.pathname.slice(0, 100) } },
      );
      // 404, não 403: para quem não tem o perfil, a área não existe.
      const notFound = NextResponse.rewrite(new URL("/nao-encontrado", request.url), {
        request: { headers: requestHeaders },
        status: 404,
      });
      return withCsp(notFound, csp);
    }
  }

  return withCsp(NextResponse.next({ request: { headers: requestHeaders } }), csp);
}

export const config = {
  runtime: "nodejs",
  matcher: [
    // Ignora assets estáticos e prefetch; eles não executam script.
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
