import { isAdminAuthenticated, isAdminCsrfTokenValid } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { PARTICIPANT_NUMBER_REGEX } from "@/_lib/participant-number";
import { AttendanceRecordModel } from "@/models/AttendanceRecord";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }
    if (!(await isAdminCsrfTokenValid(request))) {
      return jsonError("UNAUTHORIZED", "CSRF 검증에 실패했습니다.", 403);
    }

    const { userId } = await params;
    const targetUserId = decodeURIComponent(userId);
    if (!PARTICIPANT_NUMBER_REGEX.test(targetUserId)) {
      return jsonError("BAD_REQUEST", "참가자 번호 형식이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const deleted = await AttendanceRecordModel.deleteMany({
      userId: targetUserId,
      status: { $in: ["SUCCESS", "MANUAL"] },
      checkType: "IN",
    });

    return jsonSuccess({
      userId: targetUserId,
      reset: true,
      deletedCount: deleted.deletedCount ?? 0,
    });
  } catch (error) {
    console.error("[DELETE /api/attendance/:userId]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "개별 출석 초기화에 실패했습니다.", 500);
  }
}
