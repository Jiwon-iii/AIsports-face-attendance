import { z } from "zod";
import { connectToDatabase } from "@/_lib/db";
import {
  getFaceMatchMargin,
  getFaceMatchThreshold,
  recognizeFaceFromImage,
} from "@/_lib/face-engine";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { AttendanceRecordModel } from "@/models/AttendanceRecord";
import { UserModel } from "@/models/User";

const verifyAttendanceSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  checkType: z.enum(["IN", "OUT"]).default("IN"),
  deviceId: z.string().max(100).optional(),
  livenessScore: z.number().min(0).max(1).optional(),
  saveRecord: z.boolean().default(true),
  expectedUserId: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyAttendanceSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const threshold = getFaceMatchThreshold();
    const margin = getFaceMatchMargin();
    const buildFailedResponse = (input: {
      predictedUserId: string | null;
      userName: string | null;
      matchedScore: number | null;
      secondMatchedScore: number | null;
      hasFace: boolean;
    }) =>
      jsonSuccess({
        id: null,
        userId: input.predictedUserId,
        userName: input.userName,
        status: "FAILED" as const,
        checkType: parsed.data.checkType,
        matchedScore: input.matchedScore,
        secondMatchedScore: input.secondMatchedScore,
        predictedUserId: input.predictedUserId,
        threshold,
        margin,
        hasFace: input.hasFace,
        capturedAt: new Date().toISOString(),
        recordSaved: false,
        alreadyAttended: false,
      });

    let recognizeResult;
    try {
      recognizeResult = await recognizeFaceFromImage(parsed.data.imageDataUrl);
    } catch (error) {
      console.error("[POST /api/attendance/verify][recognize]", error);
      return buildFailedResponse({
        predictedUserId: null,
        userName: null,
        matchedScore: null,
        secondMatchedScore: null,
        hasFace: false,
      });
    }

    const predictedUserId = recognizeResult.topCandidate?.subject ?? null;
    const matchedScore = recognizeResult.topCandidate?.similarity ?? null;
    const secondMatchedScore = recognizeResult.secondCandidate?.similarity ?? null;

    const predictedUser = predictedUserId
      ? await UserModel.findOne({ userId: predictedUserId }).lean()
      : null;
    const userName = predictedUser?.name ?? null;
    const isExpectedUserMatched =
      !parsed.data.expectedUserId || parsed.data.expectedUserId === predictedUserId;
    const isMarginSatisfied =
      typeof secondMatchedScore !== "number" ||
      (typeof matchedScore === "number" && matchedScore - secondMatchedScore >= margin);
    const isMatched =
      typeof predictedUserId === "string" &&
      typeof matchedScore === "number" &&
      matchedScore >= threshold &&
      isMarginSatisfied &&
      Boolean(predictedUser?.isActive) &&
      isExpectedUserMatched;

    if (!isMatched) {
      return buildFailedResponse({
        predictedUserId,
        userName,
        matchedScore,
        secondMatchedScore,
        hasFace: recognizeResult.hasFace,
      });
    }

    if (!parsed.data.saveRecord) {
      return jsonSuccess({
        id: null,
        userId: predictedUserId,
        userName,
        status: "SUCCESS" as const,
        checkType: parsed.data.checkType,
        matchedScore,
        secondMatchedScore,
        predictedUserId,
        threshold,
        margin,
        hasFace: recognizeResult.hasFace,
        capturedAt: new Date().toISOString(),
        recordSaved: false,
        alreadyAttended: false,
      });
    }

    const existingAttendance =
      parsed.data.checkType === "IN"
        ? await AttendanceRecordModel.findOne({
            userId: predictedUserId,
            checkType: "IN",
            status: "SUCCESS",
          })
            .sort({ capturedAt: -1 })
            .lean()
        : null;

    if (existingAttendance) {
      return jsonSuccess({
        id: existingAttendance._id.toString(),
        userId: existingAttendance.userId,
        userName,
        status: existingAttendance.status,
        checkType: existingAttendance.checkType,
        matchedScore: matchedScore ?? null,
        secondMatchedScore,
        predictedUserId,
        threshold,
        margin,
        hasFace: recognizeResult.hasFace,
        capturedAt: existingAttendance.capturedAt.toISOString(),
        recordSaved: false,
        alreadyAttended: true,
      });
    }

    const saved = await AttendanceRecordModel.create({
      userId: predictedUserId,
      checkType: parsed.data.checkType,
      status: "SUCCESS",
      matchedScore: matchedScore ?? undefined,
      livenessScore: parsed.data.livenessScore,
      deviceId: parsed.data.deviceId,
      capturedAt: new Date(),
    });

    return jsonSuccess({
      id: saved._id.toString(),
      userId: saved.userId,
      userName,
      status: saved.status,
      checkType: saved.checkType,
      matchedScore: saved.matchedScore ?? null,
      secondMatchedScore,
      predictedUserId,
      threshold,
      margin,
      hasFace: recognizeResult.hasFace,
      capturedAt: saved.capturedAt.toISOString(),
      recordSaved: true,
      alreadyAttended: false,
    });
  } catch (error) {
    console.error("[POST /api/attendance/verify]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "출석 인증에 실패했습니다.", 500);
  }
}
