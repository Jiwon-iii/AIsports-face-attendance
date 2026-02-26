import { cookies } from "next/headers";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_CSRF_COOKIE_NAME,
  isAdminCsrfTokenValid,
} from "@/_lib/admin-auth";
import { revokeAdminSessionToken } from "@/_lib/admin-session";

function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin") {
    return true;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  return origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;

  if (sessionToken && !(await isAdminCsrfTokenValid(request)) && !isSameOriginRequest(request)) {
    return jsonError("UNAUTHORIZED", "CSRF 검증에 실패했습니다.", 403);
  }

  if (sessionToken) {
    try {
      await revokeAdminSessionToken(sessionToken);
    } catch (error) {
      console.error("[POST /api/admin/logout]", error);
    }
  }

  const response = jsonSuccess({ ok: true });
  response.cookies.set({
    name: ADMIN_AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: ADMIN_CSRF_COOKIE_NAME,
    value: "",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
