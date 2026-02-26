import { isAdminAuthenticated, isAdminCsrfTokenValid } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { AttendanceRecordModel } from "@/models/AttendanceRecord";

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }
    if (!(await isAdminCsrfTokenValid(request))) {
      return jsonError("UNAUTHORIZED", "CSRF 검증에 실패했습니다.", 403);
    }

    await connectToDatabase();

    const deleted = await AttendanceRecordModel.deleteMany({
      status: { $in: ["SUCCESS", "MANUAL"] },
      checkType: "IN",
    });

    return jsonSuccess({
      reset: true,
      deletedCount: deleted.deletedCount ?? 0,
    });
  } catch (error) {
    console.error("[POST /api/attendance/reset]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "전체 출석 초기화에 실패했습니다.", 500);
  }
}
