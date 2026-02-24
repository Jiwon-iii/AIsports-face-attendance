import { z } from "zod";
import { isAdminAuthenticated } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { ConsentModel } from "@/models/Consent";

const createConsentSchema = z.object({
  userId: z.string().min(1).max(100),
  version: z.string().min(1).max(50),
  agreedAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    const body = await request.json();
    const parsed = createConsentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const created = await ConsentModel.create({
      userId: parsed.data.userId,
      version: parsed.data.version,
      agreedAt: parsed.data.agreedAt ? new Date(parsed.data.agreedAt) : new Date(),
    });

    return jsonSuccess(
      {
        id: created._id.toString(),
        userId: created.userId,
        version: created.version,
        agreedAt: created.agreedAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/consents]", error);

    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      return jsonError("CONFLICT", "이미 동의가 등록되어 있습니다.", 409);
    }
    return jsonError("INTERNAL_SERVER_ERROR", "동의 저장에 실패했습니다.", 500);
  }
}
