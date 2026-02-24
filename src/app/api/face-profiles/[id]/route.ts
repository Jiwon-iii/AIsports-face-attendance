import { isAdminAuthenticated } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { deleteFaceSubjectFromEngine } from "@/_lib/face-engine";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { FaceProfileModel } from "@/models/FaceProfile";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    const { id } = await params;

    await connectToDatabase();
    const existing = await FaceProfileModel.findById(id).lean();

    if (!existing) {
      return jsonError("NOT_FOUND", "삭제할 얼굴 프로필을 찾을 수 없습니다.", 404);
    }

    await deleteFaceSubjectFromEngine(existing.userId);
    await FaceProfileModel.deleteOne({ _id: id });

    return jsonSuccess({
      id,
      userId: existing.userId,
      deleted: true,
    });
  } catch (error) {
    console.error("[DELETE /api/face-profiles/:id]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "얼굴 프로필 삭제에 실패했습니다.", 500);
  }
}
