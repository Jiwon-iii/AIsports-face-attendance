import { createHash, randomBytes } from "node:crypto";
import { connectToDatabase } from "@/_lib/db";
import { AdminSessionModel } from "@/models/AdminSession";

const DEFAULT_SESSION_TTL_HOURS = 8;
const MAX_SESSION_TTL_HOURS = 24 * 7;
const LAST_SEEN_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function resolveSessionTtlHours(): number {
  const envValue = process.env.ADMIN_SESSION_TTL_HOURS;
  if (!envValue) {
    return DEFAULT_SESSION_TTL_HOURS;
  }

  const parsed = Number(envValue);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_SESSION_TTL_HOURS) {
    throw new Error(`ADMIN_SESSION_TTL_HOURS must be an integer between 1 and ${MAX_SESSION_TTL_HOURS}.`);
  }

  return parsed;
}

export function getAdminSessionMaxAgeSeconds(): number {
  return resolveSessionTtlHours() * 60 * 60;
}

export async function createAdminSession(loginId: string): Promise<{ token: string }> {
  await connectToDatabase();

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getAdminSessionMaxAgeSeconds() * 1000);

  await AdminSessionModel.updateMany(
    { loginId, revokedAt: { $exists: false }, expiresAt: { $gt: now } },
    { $set: { revokedAt: now } },
  );

  await AdminSessionModel.create({
    loginId,
    tokenHash,
    expiresAt,
    lastSeenAt: now,
  });

  return { token };
}

export async function validateAdminSessionToken(token: string): Promise<boolean> {
  await connectToDatabase();

  const now = new Date();
  const tokenHash = hashSessionToken(token);
  const session = await AdminSessionModel.findOne({
    tokenHash,
    revokedAt: { $exists: false },
    expiresAt: { $gt: now },
  });

  if (!session) {
    return false;
  }

  if (now.getTime() - session.lastSeenAt.getTime() >= LAST_SEEN_UPDATE_INTERVAL_MS) {
    session.lastSeenAt = now;
    await session.save();
  }

  return true;
}

export async function revokeAdminSessionToken(token: string): Promise<void> {
  await connectToDatabase();
  const tokenHash = hashSessionToken(token);

  await AdminSessionModel.updateOne(
    { tokenHash, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}
