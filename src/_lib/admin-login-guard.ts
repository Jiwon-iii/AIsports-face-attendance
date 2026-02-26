import { createHash } from "node:crypto";
import { connectToDatabase } from "@/_lib/db";
import { AdminLoginIpStateModel } from "@/models/AdminLoginIpState";
import { AdminLoginStateModel } from "@/models/AdminLoginState";

const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_MAX_FAILURES_PER_IP = 10;
const DEFAULT_WINDOW_MINUTES = 15;
const DEFAULT_LOCKOUT_MINUTES = 15;

type LockInfo = {
  locked: boolean;
  retryAfterSec: number | null;
};

type FailureCounterDoc = {
  failedCount: number;
  windowStartedAt: Date;
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

function getGuardConfig() {
  return {
    maxFailures: parsePositiveInt("ADMIN_LOGIN_MAX_FAILURES", DEFAULT_MAX_FAILURES),
    maxFailuresPerIp: parsePositiveInt("ADMIN_LOGIN_IP_MAX_FAILURES", DEFAULT_MAX_FAILURES_PER_IP),
    windowMinutes: parsePositiveInt("ADMIN_LOGIN_WINDOW_MINUTES", DEFAULT_WINDOW_MINUTES),
    lockoutMinutes: parsePositiveInt("ADMIN_LOGIN_LOCKOUT_MINUTES", DEFAULT_LOCKOUT_MINUTES),
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

export function resolveClientIp(request: Request): string | null {
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

function mergeLockInfo(primary: LockInfo, secondary: LockInfo): LockInfo {
  if (!primary.locked && !secondary.locked) {
    return { locked: false, retryAfterSec: null };
  }

  const retryAfterSec = Math.max(primary.retryAfterSec ?? 0, secondary.retryAfterSec ?? 0);
  return { locked: true, retryAfterSec: retryAfterSec > 0 ? retryAfterSec : null };
}

async function bumpFailureCounter(input: {
  initialize: () => Promise<FailureCounterDoc | null>;
  resetWindow: () => Promise<void>;
  increment: () => Promise<FailureCounterDoc | null>;
  lockAndReset: (lockUntil: Date, now: Date) => Promise<void>;
  maxFailures: number;
  windowMinutes: number;
  lockoutMinutes: number;
}): Promise<void> {
  const now = new Date();
  const windowMs = input.windowMinutes * 60 * 1000;
  const lockUntil = new Date(now.getTime() + input.lockoutMinutes * 60 * 1000);

  const initialized = await input.initialize();
  if (!initialized) {
    return;
  }

  if (now.getTime() - initialized.windowStartedAt.getTime() > windowMs) {
    await input.resetWindow();
  }

  const increased = await input.increment();
  if (!increased) {
    return;
  }

  if (increased.failedCount >= input.maxFailures) {
    await input.lockAndReset(lockUntil, now);
  }
}

export async function isAdminLoginLocked(loginId: string, ipAddress?: string | null): Promise<LockInfo> {
  await connectToDatabase();

  const accountState = await AdminLoginStateModel.findOne({ loginId }).lean();
  const accountLock: LockInfo = {
    locked: calculateRetryAfterSec(accountState?.lockedUntil) !== null,
    retryAfterSec: calculateRetryAfterSec(accountState?.lockedUntil),
  };

  if (!ipAddress) {
    return accountLock;
  }

  const ipState = await AdminLoginIpStateModel.findOne({ loginId, ipHash: hashIp(ipAddress) }).lean();
  const ipLock: LockInfo = {
    locked: calculateRetryAfterSec(ipState?.lockedUntil) !== null,
    retryAfterSec: calculateRetryAfterSec(ipState?.lockedUntil),
  };

  return mergeLockInfo(accountLock, ipLock);
}

export async function registerAdminLoginFailure(
  loginId: string,
  ipAddress?: string | null,
): Promise<void> {
  await connectToDatabase();
  const config = getGuardConfig();

  await bumpFailureCounter({
    initialize: async () =>
      AdminLoginStateModel.findOneAndUpdate(
        { loginId },
        {
          $setOnInsert: {
            loginId,
            failedCount: 0,
            windowStartedAt: new Date(),
          },
          $set: { lastFailedAt: new Date() },
        },
        { upsert: true, new: true },
      ).lean<FailureCounterDoc | null>(),
    resetWindow: async () => {
      await AdminLoginStateModel.updateOne(
        { loginId },
        { $set: { failedCount: 0, windowStartedAt: new Date() } },
      );
    },
    increment: async () =>
      AdminLoginStateModel.findOneAndUpdate(
        { loginId },
        { $inc: { failedCount: 1 } },
        { new: true },
      ).lean<FailureCounterDoc | null>(),
    lockAndReset: async (lockUntil, now) => {
      await AdminLoginStateModel.updateOne(
        { loginId },
        { $set: { lockedUntil: lockUntil, failedCount: 0, windowStartedAt: now } },
      );
    },
    maxFailures: config.maxFailures,
    windowMinutes: config.windowMinutes,
    lockoutMinutes: config.lockoutMinutes,
  });

  if (!ipAddress) {
    return;
  }

  const ipHash = hashIp(ipAddress);
  await bumpFailureCounter({
    initialize: async () =>
      AdminLoginIpStateModel.findOneAndUpdate(
        { loginId, ipHash },
        {
          $setOnInsert: {
            loginId,
            ipHash,
            failedCount: 0,
            windowStartedAt: new Date(),
          },
          $set: { lastFailedAt: new Date() },
        },
        { upsert: true, new: true },
      ).lean<FailureCounterDoc | null>(),
    resetWindow: async () => {
      await AdminLoginIpStateModel.updateOne(
        { loginId, ipHash },
        { $set: { failedCount: 0, windowStartedAt: new Date() } },
      );
    },
    increment: async () =>
      AdminLoginIpStateModel.findOneAndUpdate(
        { loginId, ipHash },
        { $inc: { failedCount: 1 } },
        { new: true },
      ).lean<FailureCounterDoc | null>(),
    lockAndReset: async (lockUntil, now) => {
      await AdminLoginIpStateModel.updateOne(
        { loginId, ipHash },
        { $set: { lockedUntil: lockUntil, failedCount: 0, windowStartedAt: now } },
      );
    },
    maxFailures: config.maxFailuresPerIp,
    windowMinutes: config.windowMinutes,
    lockoutMinutes: config.lockoutMinutes,
  });
}

export async function clearAdminLoginFailures(
  loginId: string,
  ipAddress?: string | null,
): Promise<void> {
  await connectToDatabase();
  await AdminLoginStateModel.deleteOne({ loginId });

  if (!ipAddress) {
    return;
  }
  await AdminLoginIpStateModel.deleteOne({ loginId, ipHash: hashIp(ipAddress) });
}
