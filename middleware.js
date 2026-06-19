import { NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const buckets = new Map();

export function middleware(request) {
  const headers = securityHeaders();
  const limited = applyRateLimit(request);
  if (limited) return withHeaders(limited, headers);

  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !sameOrigin(request)) {
    return withHeaders(NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 }), headers);
  }

  return withHeaders(NextResponse.next(), headers);
}

function securityHeaders() {
  return {
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.stripe.com https://api.mercadopago.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function withHeaders(response, headers) {
  for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function applyRateLimit(request) {
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/_next") || pathname.includes(".")) return null;
  const limit = pathname.startsWith("/api/auth") ? 20 : pathname.startsWith("/api/") ? 180 : 300;
  const key = `${request.headers.get("x-forwarded-for") || "local"}:${pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, reset: now + WINDOW_MS };
  if (bucket.reset < now) {
    bucket.count = 0;
    bucket.reset = now + WINDOW_MS;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count <= limit) return null;
  return NextResponse.json({ error: "Muitas requisições. Aguarde um minuto e tente novamente." }, { status: 429 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
