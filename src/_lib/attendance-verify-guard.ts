import { createHash } from "node:crypto";
import { connectToDatabase } from "@/_lib/db";
import { AttendanceVerifyIpStateModel } from "@/models/AttendanceVerifyIpState";

const DEFAULT_VERIFY_MAX_REQUESTS_PER_IP = 120;
const DEFAULT_VERIFY_WINDOW_MINUTES = 1;
const DEFAULT_VERIFY_LOCKOUT_MINUTES = 1;

type GuardState = {
  locked: boolean;
  retryAfterSec: number | null;
};

function parsePositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function getConfig() {
  return {
    maxRequests: parsePositiveInt(
      "ATTENDANCE_VERIFY_MAX_REQUESTS_PER_IP",
      DEFAULT_VERIFY_MAX_REQUESTS_PER_IP,
    ),
    windowMinutes: parsePositiveInt("ATTENDANCE_VERIFY_WINDOW_MINUTES", DEFAULT_VERIFY_WINDOW_MINUTES),
    lockoutMinutes: parsePositiveInt(
      "ATTENDANCE_VERIFY_LOCKOUT_MINUTES",
      DEFAULT_VERIFY_LOCKOUT_MINUTES,
    ),
  };
}

function hashIp(ipAddress: string): string {
  return createHash("sha256").update(ipAddress).digest("hex");
}

function normalizeForwardedFor(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

function resolveClientIp(request: Request): string | null {
  const forwardedFor = normalizeForwardedFor(request.headers.get("x-forwarded-for"));
  if (forwardedFor) {
    return forwardedFor;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

function calculateRetryAfterSec(lockedUntil?: Date): number | null {
  if (!lockedUntil) {
    return null;
  }
  const diffMs = lockedUntil.getTime() - Date.now();
  if (diffMs <= 0) {
    return null;
  }
  return Math.ceil(diffMs / 1000);
}

export async function checkAttendanceVerifyGuard(request: Request): Promise<GuardState> {
  const ipAddress = resolveClientIp(request);
  if (!ipAddress) {
    return { locked: false, retryAfterSec: null };
  }

  await connectToDatabase();
  const config = getConfig();
  const ipHash = hashIp(ipAddress);
  const now = new Date();
  const windowMs = config.windowMinutes * 60 * 1000;
  const lockUntil = new Date(now.getTime() + config.lockoutMinutes * 60 * 1000);

  const state = await AttendanceVerifyIpStateModel.findOneAndUpdate(
    { ipHash },
    {
      $setOnInsert: {
        ipHash,
        requestCount: 0,
        windowStartedAt: now,
      },
      $set: { lastRequestedAt: now },
    },
    { upsert: true, new: true },
  );

  if (!state) {
    return { locked: false, retryAfterSec: null };
  }

  const retryAfterSec = calculateRetryAfterSec(state.lockedUntil);
  if (retryAfterSec !== null) {
    return { locked: true, retryAfterSec };
  }

  if (now.getTime() - state.windowStartedAt.getTime() > windowMs) {
    state.requestCount = 0;
    state.windowStartedAt = now;
  }

  state.requestCount += 1;
  if (state.requestCount > config.maxRequests) {
    state.lockedUntil = lockUntil;
    state.requestCount = 0;
    state.windowStartedAt = now;
    await state.save();
    return { locked: true, retryAfterSec: calculateRetryAfterSec(lockUntil) };
  }

  await state.save();
  return { locked: false, retryAfterSec: null };
}
