import { z } from "zod";
import { isAdminAuthenticated } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { deleteFaceSubjectFromEngine } from "@/_lib/face-engine";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { AttendanceRecordModel } from "@/models/AttendanceRecord";
import { ConsentModel } from "@/models/Consent";
import { FaceProfileModel } from "@/models/FaceProfile";
import { USER_GENDERS, UserModel } from "@/models/User";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100),
  gender: z.enum(USER_GENDERS),
  age: z.coerce.number().int().min(1).max(120),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    const { userId } = await params;
    const targetUserId = decodeURIComponent(userId);

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const updated = await UserModel.findOneAndUpdate(
      { userId: targetUserId },
      {
        $set: {
          name: parsed.data.name.trim(),
          gender: parsed.data.gender,
          age: parsed.data.age,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      return jsonError("NOT_FOUND", "수정할 참가자를 찾을 수 없습니다.", 404);
    }

    return jsonSuccess({
      id: updated._id.toString(),
      userId: updated.userId,
      name: updated.name,
      gender: updated.gender,
      age: updated.age,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/users/:userId]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "참가자 수정에 실패했습니다.", 500);
  }
}

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

    const existingUser = await UserModel.findOne({ userId: targetUserId }).lean();
    if (!existingUser) {
      return jsonError("NOT_FOUND", "삭제할 참가자를 찾을 수 없습니다.", 404);
    }

    await deleteFaceSubjectFromEngine(targetUserId);

    await Promise.all([
      UserModel.deleteOne({ userId: targetUserId }),
      ConsentModel.deleteMany({ userId: targetUserId }),
      FaceProfileModel.deleteMany({ userId: targetUserId }),
      AttendanceRecordModel.deleteMany({ userId: targetUserId }),
    ]);

    return jsonSuccess({
      userId: targetUserId,
      deleted: true,
    });
  } catch (error) {
    console.error("[DELETE /api/users/:userId]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "참가자 삭제에 실패했습니다.", 500);
  }
}
