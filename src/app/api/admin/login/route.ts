import { z } from "zod";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { ADMIN_AUTH_COOKIE_NAME } from "@/_lib/admin-auth";
import {
  hashAdminPassword,
  isHashedAdminPassword,
  verifyAdminPassword,
} from "@/_lib/admin-password";
import { connectToDatabase } from "@/_lib/db";
import { AdminAccountModel } from "@/models/AdminAccount";

const loginSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "아이디 또는 비밀번호 형식이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const account = await AdminAccountModel.findOne({ loginId: parsed.data.id.trim() });
    if (!account) {
      return jsonError("BAD_REQUEST", "아이디 또는 비밀번호가 올바르지 않습니다.", 401);
    }

    const rawPassword = parsed.data.password;
    const storedPassword = account.password;

    const isAuthenticated = isHashedAdminPassword(storedPassword)
      ? verifyAdminPassword(rawPassword, storedPassword)
      : storedPassword === rawPassword;

    if (!isAuthenticated) {
      return jsonError("BAD_REQUEST", "아이디 또는 비밀번호가 올바르지 않습니다.", 401);
    }

    if (!isHashedAdminPassword(storedPassword)) {
      account.password = hashAdminPassword(rawPassword);
      await account.save();
    }

    const response = jsonSuccess({ ok: true });
    response.cookies.set({
      name: ADMIN_AUTH_COOKIE_NAME,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (error) {
    console.error("[POST /api/admin/login]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "관리자 로그인에 실패했습니다.", 500);
  }
}
