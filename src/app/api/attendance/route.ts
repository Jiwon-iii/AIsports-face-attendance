import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import {
  ATTENDANCE_STATUSES,
  AttendanceRecordModel,
  CHECK_TYPES,
} from "@/models/AttendanceRecord";

const createAttendanceSchema = z.object({
  userId: z.string().min(1).max(100),
  checkType: z.enum(CHECK_TYPES).default("IN"),
  status: z.enum(ATTENDANCE_STATUSES),
  matchedScore: z.number().min(0).max(1).optional(),
  livenessScore: z.number().min(0).max(1).optional(),
  capturedAt: z.string().datetime().optional(),
  deviceId: z.string().max(100).optional(),
});

const listAttendanceSchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

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
