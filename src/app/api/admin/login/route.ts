import { z } from "zod";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { ADMIN_AUTH_COOKIE_NAME, ADMIN_CSRF_COOKIE_NAME, createAdminCsrfToken } from "@/_lib/admin-auth";
import {
  clearAdminLoginFailures,
  isAdminLoginLocked,
  registerAdminLoginFailure,
  resolveClientIp,
} from "@/_lib/admin-login-guard";
import { createAdminSession, getAdminSessionMaxAgeSeconds } from "@/_lib/admin-session";
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

    const loginId = parsed.data.id.trim();
    const clientIp = resolveClientIp(request);
    const lockInfo = await isAdminLoginLocked(loginId, clientIp);
    if (lockInfo.locked) {
      const response = jsonError(
        "UNAUTHORIZED",
        "로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.",
        429,
      );
      if (lockInfo.retryAfterSec) {
        response.headers.set("Retry-After", String(lockInfo.retryAfterSec));
      }
      return response;
    }

    await connectToDatabase();

    const account = await AdminAccountModel.findOne({ loginId });
    if (!account) {
      await registerAdminLoginFailure(loginId, clientIp);
      const updatedLock = await isAdminLoginLocked(loginId, clientIp);
      if (updatedLock.locked) {
        const response = jsonError(
          "UNAUTHORIZED",
          "로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.",
          429,
        );
        if (updatedLock.retryAfterSec) {
          response.headers.set("Retry-After", String(updatedLock.retryAfterSec));
        }
        return response;
      }
      return jsonError("BAD_REQUEST", "아이디 또는 비밀번호가 올바르지 않습니다.", 401);
    }

    const rawPassword = parsed.data.password;
    const storedPassword = account.password;
    const isLegacyPlainPassword = !isHashedAdminPassword(storedPassword);
    const isAuthenticated = isLegacyPlainPassword
      ? storedPassword === rawPassword
      : verifyAdminPassword(rawPassword, storedPassword);

    if (!isAuthenticated) {
      await registerAdminLoginFailure(loginId, clientIp);
      const updatedLock = await isAdminLoginLocked(loginId, clientIp);
      if (updatedLock.locked) {
        const response = jsonError(
          "UNAUTHORIZED",
          "로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.",
          429,
        );
        if (updatedLock.retryAfterSec) {
          response.headers.set("Retry-After", String(updatedLock.retryAfterSec));
        }
        return response;
      }
      return jsonError("BAD_REQUEST", "아이디 또는 비밀번호가 올바르지 않습니다.", 401);
    }

    if (isLegacyPlainPassword) {
      account.password = hashAdminPassword(rawPassword);
      await account.save();
      console.warn(`[POST /api/admin/login] migrated legacy plain password for loginId=${loginId}`);
    }

    await clearAdminLoginFailures(loginId, clientIp);

    const session = await createAdminSession(account.loginId);
    const csrfToken = createAdminCsrfToken();
    const response = jsonSuccess({ ok: true });
    response.cookies.set({
      name: ADMIN_AUTH_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getAdminSessionMaxAgeSeconds(),
    });
    response.cookies.set({
      name: ADMIN_CSRF_COOKIE_NAME,
      value: csrfToken,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getAdminSessionMaxAgeSeconds(),
    });
    return response;
  } catch (error) {
    console.error("[POST /api/admin/login]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "관리자 로그인에 실패했습니다.", 500);
  }
}
