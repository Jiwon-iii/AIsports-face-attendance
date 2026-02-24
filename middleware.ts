import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const adminCookieName = process.env.ADMIN_AUTH_COOKIE_NAME ?? "admin_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!isAdminRoute || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(adminCookieName)?.value;
  if (authCookie === "1") {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
