import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { UserModel } from "@/models/User";

const createUserSchema = z.object({
  userId: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("BAD_REQUEST", "입력값이 올바르지 않습니다.", 400);
    }

    await connectToDatabase();

    const created = await UserModel.create(parsed.data);
    return jsonSuccess(
      {
        id: created._id.toString(),
        userId: created.userId,
        name: created.name,
        email: created.email ?? null,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/users]", error);

    const mongoError = error as { code?: number };
    if (mongoError.code === 11000) {
      return jsonError("CONFLICT", "이미 존재하는 사용자입니다.", 409);
    }

    return jsonError("INTERNAL_SERVER_ERROR", "사용자 생성에 실패했습니다.", 500);
  }
}
