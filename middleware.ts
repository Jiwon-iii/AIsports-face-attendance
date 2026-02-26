import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const adminCookieName = process.env.ADMIN_AUTH_COOKIE_NAME ?? "admin_auth";

function buildContentSecurityPolicy() {
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
    : "script-src 'self' 'unsafe-inline';";
  const connectSrc = isDev
    ? "connect-src 'self' ws: wss: http://localhost:* https://localhost:*;"
    : "connect-src 'self';";

  return [
    "default-src 'self';",
    scriptSrc,
    "style-src 'self' 'unsafe-inline';",
    "img-src 'self' data: blob:;",
    "font-src 'self' data:;",
    connectSrc,
    "media-src 'self' blob:;",
    "base-uri 'self';",
    "form-action 'self';",
    "frame-ancestors 'none';",
    "object-src 'none';",
  ].join(" ");
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!isAdminRoute || pathname === "/admin/login") {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const authCookie = request.cookies.get(adminCookieName)?.value;
  if (authCookie && authCookie.length > 0) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  const response = NextResponse.redirect(loginUrl);
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
