#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";
import { randomInt } from "node:crypto";

const PARTICIPANT_MIN = 10000000;
const PARTICIPANT_MAX = 99999999;
const DIGITS_ONLY_REGEX = /^\d+$/;

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    apply: args.has("--apply"),
    syncFaceEngine: args.has("--sync-face-engine"),
  };
}

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }
  return {
    uri,
    dbName: process.env.MONGODB_DB_NAME || "ai_face_attendance",
  };
}

function createCandidate() {
  return String(randomInt(PARTICIPANT_MIN, PARTICIPANT_MAX + 1));
}

function buildFaceEngineConfig() {
  const apiKey = process.env.COMPREFACE_RECOGNITION_API_KEY;
  if (!apiKey) {
    throw new Error("COMPREFACE_RECOGNITION_API_KEY is required when --sync-face-engine is used.");
  }

  const server = (process.env.COMPREFACE_SERVER || "http://localhost").replace(/\/$/, "");
  const port = process.env.COMPREFACE_PORT || "8000";
  const baseUrl = `${server}:${port}`;

  return { baseUrl, apiKey };
}

function parseDataUrl(dataUrl) {
  const matched = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!matched) {
    throw new Error("Invalid image data URL");
  }
  const contentType = matched[1];
  const base64 = matched[2];
  const buffer = Buffer.from(base64, "base64");
  return { contentType, buffer };
}

async function deleteSubject(baseUrl, apiKey, subject) {
  const url = `${baseUrl}/api/v1/recognition/subjects/${encodeURIComponent(subject)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`delete subject failed (${res.status}): ${body}`);
  }
}

async function uploadFace(baseUrl, apiKey, subject, imageDataUrl, index) {
  const { contentType, buffer } = parseDataUrl(imageDataUrl);
  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], { type: contentType }),
    `sample-${index + 1}.${contentType.includes("png") ? "png" : "jpg"}`,
  );

  const url = `${baseUrl}/api/v1/recognition/faces?subject=${encodeURIComponent(subject)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`upload face failed (${res.status}): ${body}`);
  }
}

async function prepareFaceEngineNewSubjects(db, migrations) {
  const { baseUrl, apiKey } = buildFaceEngineConfig();
  const faceProfiles = db.collection("faceProfiles");

  for (const migration of migrations) {
    const profile = await faceProfiles.findOne({ userId: migration.fromUserId });
    const samples = Array.isArray(profile?.samples) ? profile.samples : [];
    const imageSamples = samples.filter((sample) => typeof sample?.imageDataUrl === "string");

    // Clear only the new subject to make this step idempotent.
    await deleteSubject(baseUrl, apiKey, migration.toUserId);

    for (let i = 0; i < imageSamples.length; i += 1) {
      await uploadFace(baseUrl, apiKey, migration.toUserId, imageSamples[i].imageDataUrl, i);
    }
  }
}

async function cleanupFaceEngineOldSubjects(migrations) {
  const { baseUrl, apiKey } = buildFaceEngineConfig();
  const failed = [];

  for (const migration of migrations) {
    try {
      await deleteSubject(baseUrl, apiKey, migration.fromUserId);
    } catch (error) {
      failed.push({
        fromUserId: migration.fromUserId,
        toUserId: migration.toUserId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return failed;
}

async function main() {
  const options = parseArgs(process.argv);
  loadEnvLocal();

  const { uri, dbName } = getMongoConfig();
  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db;

  const usersCol = db.collection("users");
  const faceProfilesCol = db.collection("faceProfiles");
  const consentsCol = db.collection("consents");
  const attendanceCol = db.collection("attendanceRecords");

  const users = await usersCol.find({}, { projection: { _id: 0, userId: 1 } }).toArray();
  const existingIds = new Set(users.map((user) => String(user.userId)));
  const migrations = [];

  for (const user of users) {
    const oldId = String(user.userId);
    if (DIGITS_ONLY_REGEX.test(oldId)) {
      continue;
    }

    let newId = null;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidate = createCandidate();
      if (!existingIds.has(candidate)) {
        newId = candidate;
        break;
      }
    }
    if (!newId) {
      throw new Error(`No available participant number for ${oldId}`);
    }

    existingIds.delete(oldId);
    existingIds.add(newId);
    migrations.push({ fromUserId: oldId, toUserId: newId });
  }

  console.log(`[participant-migration] target users: ${users.length}`);
  console.log(`[participant-migration] users to migrate: ${migrations.length}`);
  if (migrations.length > 0) {
    console.log("[participant-migration] mapping preview:");
    for (const row of migrations) {
      console.log(`  - ${row.fromUserId} -> ${row.toUserId}`);
    }
  }

  if (!options.apply) {
    console.log("[participant-migration] dry-run complete. add --apply to execute.");
    await mongoose.disconnect();
    return;
  }

  if (options.syncFaceEngine && migrations.length > 0) {
    // Prepare new subjects first. If this fails, DB is still untouched.
    await prepareFaceEngineNewSubjects(db, migrations);
    console.log("[participant-migration] face engine pre-sync complete.");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const migration of migrations) {
        await usersCol.updateOne(
          { userId: migration.fromUserId },
          { $set: { userId: migration.toUserId } },
          { session },
        );
        await faceProfilesCol.updateMany(
          { userId: migration.fromUserId },
          { $set: { userId: migration.toUserId } },
          { session },
        );
        await consentsCol.updateMany(
          { userId: migration.fromUserId },
          { $set: { userId: migration.toUserId } },
          { session },
        );
        await attendanceCol.updateMany(
          { userId: migration.fromUserId },
          { $set: { userId: migration.toUserId } },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  if (options.syncFaceEngine && migrations.length > 0) {
    const failedCleanup = await cleanupFaceEngineOldSubjects(migrations);
    if (failedCleanup.length > 0) {
      console.warn("[participant-migration] warning: failed to clean up some old face subjects.");
      console.warn(JSON.stringify(failedCleanup, null, 2));
    } else {
      console.log("[participant-migration] face engine old-subject cleanup complete.");
    }
  } else {
    console.log(
      "[participant-migration] face engine sync skipped. use --sync-face-engine to sync CompreFace subjects.",
    );
  }

  const outputPath = path.resolve(process.cwd(), "migration-participant-number-map.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(migrations, null, 2)}\n`, "utf8");
  console.log(`[participant-migration] mapping saved: ${outputPath}`);
  console.log("[participant-migration] done.");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("[participant-migration] failed", error);
  try {
    await mongoose.disconnect();
  } catch {
    // noop
  }
  process.exit(1);
});
