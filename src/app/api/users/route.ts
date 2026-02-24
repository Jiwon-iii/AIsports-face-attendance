import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isAdminAuthenticated } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { AttendanceRecordModel } from "@/models/AttendanceRecord";
import { USER_GENDERS, UserModel } from "@/models/User";

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  gender: z.enum(USER_GENDERS),
  age: z.coerce.number().int().min(1).max(120),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const created = await UserModel.create({
      userId: `U-${randomUUID().slice(0, 8)}`,
      name: parsed.data.name.trim(),
      gender: parsed.data.gender,
      age: parsed.data.age,
      isActive: parsed.data.isActive ?? true,
    });

    return jsonSuccess(
      {
        id: created._id.toString(),
        userId: created.userId,
        name: created.name,
        gender: created.gender,
        age: created.age,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/users]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "참가자 생성에 실패했습니다.", 500);
  }
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    await connectToDatabase();
    const users = await UserModel.find({}).sort({ createdAt: -1 }).limit(200).lean();
    const attendanceSummary = await AttendanceRecordModel.aggregate<{
      _id: string;
      lastAttendanceAt: Date;
    }>([
      { $match: { status: "SUCCESS", checkType: "IN" } },
      { $sort: { capturedAt: -1 } },
      {
        $group: {
          _id: "$userId",
          lastAttendanceAt: { $first: "$capturedAt" },
        },
      },
    ]);
    const attendanceMap = new Map(
      attendanceSummary.map((item) => [item._id, item.lastAttendanceAt.toISOString()]),
    );

    return jsonSuccess({
      items: users.map((user) => ({
        id: user._id.toString(),
        userId: user.userId,
        name: user.name,
        gender: user.gender,
        age: user.age,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        isAttended: attendanceMap.has(user.userId),
        lastAttendanceAt: attendanceMap.get(user.userId) ?? null,
      })),
      count: users.length,
    });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "참가자 조회에 실패했습니다.", 500);
  }
}
