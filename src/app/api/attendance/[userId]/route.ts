import { isAdminAuthenticated } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { AttendanceRecordModel } from "@/models/AttendanceRecord";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    const { userId } = await params;
    const targetUserId = decodeURIComponent(userId);

    await connectToDatabase();

    const deleted = await AttendanceRecordModel.deleteMany({
      userId: targetUserId,
      status: "SUCCESS",
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
