import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const HASH_ALGORITHM = "sha512";
const HASH_ITERATIONS = 120_000;
const HASH_KEYLEN = 64;
const HASH_PREFIX = "pbkdf2";

function derive(password: string, salt: Buffer, iterations: number, keylen: number) {
  return pbkdf2Sync(password, salt, iterations, keylen, HASH_ALGORITHM);
}

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = derive(password, salt, HASH_ITERATIONS, HASH_KEYLEN);
  return [
    HASH_PREFIX,
    HASH_ALGORITHM,
    String(HASH_ITERATIONS),
    String(HASH_KEYLEN),
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export function isHashedAdminPassword(value: string): boolean {
  return value.startsWith(`${HASH_PREFIX}$`);
}

export function verifyAdminPassword(password: string, storedValue: string): boolean {
  const parts = storedValue.split("$");
  if (parts.length !== 6) {
    return false;
  }

  const [prefix, algorithm, iterationsRaw, keylenRaw, saltBase64, hashBase64] = parts;
  if (prefix !== HASH_PREFIX || algorithm !== HASH_ALGORITHM) {
    return false;
  }

  const iterations = Number(iterationsRaw);
  const keylen = Number(keylenRaw);
  if (!Number.isInteger(iterations) || !Number.isInteger(keylen) || iterations <= 0 || keylen <= 0) {
    return false;
  }

  const salt = Buffer.from(saltBase64, "base64");
  const expected = Buffer.from(hashBase64, "base64");
  const actual = derive(password, salt, iterations, keylen);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
