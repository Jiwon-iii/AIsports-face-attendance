import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { validateAdminSessionToken } from "@/_lib/admin-session";

export const ADMIN_AUTH_COOKIE_NAME = process.env.ADMIN_AUTH_COOKIE_NAME ?? "admin_auth";
export const ADMIN_CSRF_COOKIE_NAME = process.env.ADMIN_CSRF_COOKIE_NAME ?? "admin_csrf";

export function createAdminCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return false;
  }

  try {
    return await validateAdminSessionToken(sessionToken);
  } catch (error) {
    console.error("[isAdminAuthenticated]", error);
    return false;
  }
}

export async function isAdminCsrfTokenValid(request: Request): Promise<boolean> {
  const csrfHeader = request.headers.get("x-csrf-token");
  if (!csrfHeader) {
    return false;
  }

  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get(ADMIN_CSRF_COOKIE_NAME)?.value;
  if (!csrfCookie) {
    return false;
  }

  const headerBuffer = Buffer.from(csrfHeader, "utf8");
  const cookieBuffer = Buffer.from(csrfCookie, "utf8");
  if (headerBuffer.length !== cookieBuffer.length) {
    return false;
  }

  return timingSafeEqual(headerBuffer, cookieBuffer);
}
