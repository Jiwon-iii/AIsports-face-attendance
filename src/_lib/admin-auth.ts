import { cookies } from "next/headers";

export const ADMIN_AUTH_COOKIE_NAME = process.env.ADMIN_AUTH_COOKIE_NAME ?? "admin_auth";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value === "1";
}
