import { z } from "zod";
import { isAdminAuthenticated, isAdminCsrfTokenValid } from "@/_lib/admin-auth";
import { connectToDatabase } from "@/_lib/db";
import { registerFaceSamplesToEngine } from "@/_lib/face-engine";
import { jsonError, jsonSuccess } from "@/_lib/api-response";
import { PARTICIPANT_NUMBER_REGEX } from "@/_lib/participant-number";
import { ConsentModel } from "@/models/Consent";
import { FACE_SAMPLE_SOURCES, FaceProfileModel } from "@/models/FaceProfile";
import { UserModel } from "@/models/User";

const createFaceProfileSchema = z.object({
  userId: z.string().min(1).max(100).regex(PARTICIPANT_NUMBER_REGEX),
  samples: z
    .array(
      z.object({
        imageDataUrl: z.string().startsWith("data:image/"),
        source: z.enum(FACE_SAMPLE_SOURCES),
        capturedAt: z.string().datetime().optional(),
      }),
    )
    .min(1)
    .max(3),
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
    const parsed = createFaceProfileSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const [user, consent] = await Promise.all([
      UserModel.findOne({ userId: parsed.data.userId }).lean(),
      ConsentModel.findOne({
        userId: parsed.data.userId,
        $or: [{ revokedAt: null }, { revokedAt: { $exists: false } }],
      }).lean(),
    ]);

    if (!user) {
      return jsonError("NOT_FOUND", "해당 사용자를 찾을 수 없습니다.", 404);
    }
    if (!consent) {
      return jsonError("BAD_REQUEST", "동의 정보가 없어 얼굴을 등록할 수 없습니다.", 400);
    }

    const samples = parsed.data.samples.map((sample) => ({
      imageDataUrl: sample.imageDataUrl,
      source: sample.source,
      capturedAt: sample.capturedAt ? new Date(sample.capturedAt) : new Date(),
    }));

    await registerFaceSamplesToEngine(parsed.data.userId, samples);

    const saved = await FaceProfileModel.findOneAndUpdate(
      { userId: parsed.data.userId },
      {
        $set: {
          userId: parsed.data.userId,
          samples,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return jsonSuccess(
      {
        id: saved._id.toString(),
        userId: saved.userId,
        sampleCount: saved.samples.length,
        updatedAt: saved.updatedAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/face-profiles]", error);
    const message =
      error instanceof Error ? `얼굴 등록에 실패했습니다. (${error.message})` : "얼굴 등록에 실패했습니다.";
    return jsonError("INTERNAL_SERVER_ERROR", message, 500);
  }
}

export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return jsonError("UNAUTHORIZED", "관리자 로그인이 필요합니다.", 401);
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    await connectToDatabase();

    const filter = userId ? { userId } : {};
    const profiles = await FaceProfileModel.find(filter).sort({ updatedAt: -1 }).limit(100).lean();

    return jsonSuccess({
      items: profiles.map((profile) => ({
        id: profile._id.toString(),
        userId: profile.userId,
        sampleCount: profile.samples?.length ?? 0,
        samples: (profile.samples ?? []).map((sample) => ({
          imageDataUrl: sample.imageDataUrl,
          source: sample.source,
          capturedAt: sample.capturedAt.toISOString(),
        })),
        qualityScore: profile.qualityScore ?? null,
        updatedAt: profile.updatedAt.toISOString(),
      })),
      count: profiles.length,
    });
  } catch (error) {
    console.error("[GET /api/face-profiles]", error);
    return jsonError("INTERNAL_SERVER_ERROR", "얼굴 목록 조회에 실패했습니다.", 500);
  }
}
