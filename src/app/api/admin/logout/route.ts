import { jsonSuccess } from "@/_lib/api-response";
import { ADMIN_AUTH_COOKIE_NAME } from "@/_lib/admin-auth";

export async function POST() {
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
  return response;
}
