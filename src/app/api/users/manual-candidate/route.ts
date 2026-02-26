import { z } from "zod";
import { isAdminAuthenticated } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { PARTICIPANT_NUMBER_REGEX } from "@/_lib/participant-number";
import { FaceProfileModel } from "@/models/FaceProfile";
import { UserModel } from "@/models/User";

const querySchema = z.object({
  userId: z.string().regex(PARTICIPANT_NUMBER_REGEX),
});

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      userId: url.searchParams.get("userId") ?? "",
    });
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "참가자 번호 형식이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ userId: parsed.data.userId }).lean();
    if (!user || !user.isActive) {
      return jsonError("NOT_FOUND", "활성 참가자를 찾을 수 없습니다.", 404);
    }

    const profile = await FaceProfileModel.findOne(
      { userId: parsed.data.userId },
      { samples: { $slice: 1 } },
    ).lean();

    const imageDataUrl =
      Array.isArray(profile?.samples) && profile.samples[0]?.imageDataUrl
        ? profile.samples[0].imageDataUrl
        : null;

    return jsonSuccess({
      userId: user.userId,
      name: user.name,
      imageDataUrl,
    });
  } catch (error) {
    console.error("[GET /api/users/manual-candidate]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "수동 출석 후보 조회에 실패했습니다.", 500);
  }
}
