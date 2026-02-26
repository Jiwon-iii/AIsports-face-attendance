import { z } from "zod";
import { isAdminAuthenticated, isAdminCsrfTokenValid } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { createParticipantNumberCandidate } from "@/_lib/participant-number";
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
    if (!(await isAdminCsrfTokenValid(request))) {
      return jsonError("UNAUTHORIZED", "CSRF 검증에 실패했습니다.", 403);
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    let createdPayload: {
      id: string;
      userId: string;
      name: string;
      gender: (typeof USER_GENDERS)[number];
      age: number;
      isActive: boolean;
      createdAt: string;
    } | null = null;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = createParticipantNumberCandidate();
      try {
        const created = await UserModel.create({
          userId: candidate,
          name: parsed.data.name.trim(),
          gender: parsed.data.gender,
          age: parsed.data.age,
          isActive: parsed.data.isActive ?? true,
        });
        createdPayload = {
          id: created._id.toString(),
          userId: created.userId,
          name: created.name,
          gender: created.gender,
          age: created.age,
          isActive: created.isActive,
          createdAt: created.createdAt.toISOString(),
        };
        break;
      } catch (error) {
        const mongoError = error as { code?: number };
        if (mongoError.code === 11000) {
          continue;
        }
        throw error;
      }
    }

    if (!createdPayload) {
      return jsonError(
        "INTERNAL_SERVER_ERROR",
        "참가자 번호 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        500,
      );
    }

    return jsonSuccess(createdPayload, 201);
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
      { $match: { status: { $in: ["SUCCESS", "MANUAL"] }, checkType: "IN" } },
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
