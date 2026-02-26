import { z } from "zod";
import { isAdminAuthenticated, isAdminCsrfTokenValid } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { PARTICIPANT_NUMBER_REGEX } from "@/_lib/participant-number";
import {
  ATTENDANCE_STATUSES,
  AttendanceRecordModel,
  CHECK_TYPES,
} from "@/models/AttendanceRecord";
import { UserModel } from "@/models/User";

const createAttendanceSchema = z.object({
  userId: z.string().min(1).max(100).regex(PARTICIPANT_NUMBER_REGEX),
  checkType: z.enum(CHECK_TYPES).default("IN"),
  status: z.enum(ATTENDANCE_STATUSES),
  matchedScore: z.number().min(0).max(1).optional(),
  livenessScore: z.number().min(0).max(1).optional(),
  capturedAt: z.string().datetime().optional(),
  deviceId: z.string().max(100).optional(),
});

const listAttendanceSchema = z.object({
  userId: z.string().regex(PARTICIPANT_NUMBER_REGEX).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
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
    const parsed = createAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ userId: parsed.data.userId }).lean();
    if (!user) {
      return jsonError("NOT_FOUND", "해당 사용자를 찾을 수 없습니다.", 404);
    }
    if (!user.isActive) {
      return jsonError("BAD_REQUEST", "비활성 사용자입니다. 관리자에게 문의해 주세요.", 400);
    }

    if (parsed.data.checkType === "IN") {
      const existingAttendance = await AttendanceRecordModel.findOne({
        userId: parsed.data.userId,
        checkType: "IN",
        status: { $in: ["SUCCESS", "MANUAL"] },
      }).lean();
      if (existingAttendance) {
        return jsonError("CONFLICT", "이미 출석 처리된 사용자입니다.", 409);
      }
    }

    const created = await AttendanceRecordModel.create({
      ...parsed.data,
      capturedAt: parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date(),
    });

    return jsonSuccess(
      {
        id: created._id.toString(),
        userId: created.userId,
        checkType: created.checkType,
        status: created.status,
        matchedScore: created.matchedScore ?? null,
        livenessScore: created.livenessScore ?? null,
        capturedAt: created.capturedAt.toISOString(),
        deviceId: created.deviceId ?? null,
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/attendance]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "출석 저장에 실패했습니다.", 500);
  }
}

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    const url = new URL(request.url);
    const parsed = listAttendanceSchema.safeParse({
      userId: url.searchParams.get("userId") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "조회 파라미터가 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const filter = parsed.data.userId ? { userId: parsed.data.userId } : {};
    const records = await AttendanceRecordModel.find(filter)
      .sort({ capturedAt: -1 })
      .limit(parsed.data.limit)
      .lean();

    return jsonSuccess({
      items: records.map((record) => ({
        id: record._id.toString(),
        userId: record.userId,
        checkType: record.checkType,
        status: record.status,
        matchedScore: record.matchedScore ?? null,
        livenessScore: record.livenessScore ?? null,
        capturedAt: record.capturedAt.toISOString(),
        deviceId: record.deviceId ?? null,
      })),
      count: records.length,
    });
  } catch (error) {
    console.error("[GET /api/attendance]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "출석 조회에 실패했습니다.", 500);
  }
}
