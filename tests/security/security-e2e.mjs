import { execSync, spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

function loadDotEnvLocal() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(currentDir, "../..");
  const envPath = resolve(projectRoot, ".env.local");
  let content = "";

  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    return;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) {
      continue;
    }
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, "$1");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnvLocal();

const DEFAULT_PORT = process.env.SECURITY_TEST_PORT
  ? Number(process.env.SECURITY_TEST_PORT)
  : 0;
const ADMIN_ID = "e2e-admin";
const ADMIN_PASSWORD = "e2e-password";
const INVALID_ADMIN_ID = "e2e-admin-invalid";

const AUTH_COOKIE_NAME = process.env.ADMIN_AUTH_COOKIE_NAME ?? "admin_auth";
const CSRF_COOKIE_NAME = process.env.ADMIN_CSRF_COOKIE_NAME ?? "admin_csrf";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function splitCombinedSetCookie(headerValue) {
  if (!headerValue) {
    return [];
  }

  const values = [];
  let start = 0;
  let inExpires = false;

  for (let i = 0; i < headerValue.length; i += 1) {
    const ch = headerValue[i];
    if (headerValue.slice(i, i + 8).toLowerCase() === "expires=") {
      inExpires = true;
    }
    if (inExpires && ch === ";") {
      inExpires = false;
    }
    if (!inExpires && ch === "," && headerValue[i + 1] === " ") {
      values.push(headerValue.slice(start, i).trim());
      start = i + 1;
    }
  }

  values.push(headerValue.slice(start).trim());
  return values.filter(Boolean);
}

function getSetCookieValues(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const combined = response.headers.get("set-cookie");
  return splitCombinedSetCookie(combined);
}

function parseCookieJar(setCookieValues) {
  const jar = new Map();
  for (const raw of setCookieValues) {
    const [kv] = raw.split(";", 1);
    const eqIdx = kv.indexOf("=");
    if (eqIdx <= 0) {
      continue;
    }
    const key = kv.slice(0, eqIdx).trim();
    const value = kv.slice(eqIdx + 1).trim();
    jar.set(key, value);
  }
  return jar;
}

async function waitUntilReady(baseUrl, timeoutMs = 120_000) {
  const timeoutAt = Date.now() + timeoutMs;
  while (Date.now() < timeoutAt) {
    try {
      const res = await fetch(`${baseUrl}/admin/login`, { method: "GET" });
      if (res.ok) {
        return true;
      }
    } catch {
      // retry
    }
    await delay(1000);
  }
  return false;
}

async function findAvailablePort(preferredPort) {
  const tryPort = async (port) =>
    new Promise((resolvePort, rejectPort) => {
      const server = net.createServer();
      server.unref();
      server.on("error", rejectPort);
      server.listen(port, "127.0.0.1", () => {
        const address = server.address();
        server.close(() => {
          if (!address || typeof address === "string") {
            rejectPort(new Error("Failed to resolve free port."));
            return;
          }
          resolvePort(address.port);
        });
      });
    });

  try {
    return await tryPort(preferredPort);
  } catch {
    return tryPort(0);
  }
}

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || "ai_face_attendance",
  });
}

async function setupFixtures() {
  const db = mongoose.connection.db;
  await db.collection("adminAccounts").updateOne(
    { loginId: ADMIN_ID },
    {
      $set: {
        loginId: ADMIN_ID,
        password: ADMIN_PASSWORD,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  await db.collection("adminLoginStates").deleteMany({
    loginId: { $in: [ADMIN_ID, INVALID_ADMIN_ID] },
  });
  await db.collection("adminLoginIpStates").deleteMany({
    loginId: { $in: [ADMIN_ID, INVALID_ADMIN_ID] },
  });
  await db.collection("adminSessions").deleteMany({
    loginId: ADMIN_ID,
  });
}

async function cleanupFixtures() {
  const db = mongoose.connection.db;
  await db.collection("adminAccounts").deleteMany({ loginId: ADMIN_ID });
  await db.collection("adminLoginStates").deleteMany({
    loginId: { $in: [ADMIN_ID, INVALID_ADMIN_ID] },
  });
  await db.collection("adminLoginIpStates").deleteMany({
    loginId: { $in: [ADMIN_ID, INVALID_ADMIN_ID] },
  });
  await db.collection("adminSessions").deleteMany({ loginId: ADMIN_ID });
}

async function loginAndReadCookies(baseUrl) {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: ADMIN_ID, password: ADMIN_PASSWORD }),
  });

  assert(response.status === 200, `Login expected 200, got ${response.status}`);

  const cookieJar = parseCookieJar(getSetCookieValues(response));
  const authCookie = cookieJar.get(AUTH_COOKIE_NAME);
  const csrfCookie = cookieJar.get(CSRF_COOKIE_NAME);

  assert(Boolean(authCookie), `${AUTH_COOKIE_NAME} cookie missing after login`);
  assert(Boolean(csrfCookie), `${CSRF_COOKIE_NAME} cookie missing after login`);

  return { authCookie, csrfCookie };
}

async function testCsrfProtection(baseUrl, cookies) {
  const cookieHeader = `${AUTH_COOKIE_NAME}=${cookies.authCookie}; ${CSRF_COOKIE_NAME}=${cookies.csrfCookie}`;

  const withoutCsrf = await fetch(`${baseUrl}/api/attendance/reset`, {
    method: "POST",
    headers: { cookie: cookieHeader },
  });
  assert(withoutCsrf.status === 403, `Expected 403 without CSRF token, got ${withoutCsrf.status}`);

  const withCsrf = await fetch(`${baseUrl}/api/attendance/reset`, {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      "x-csrf-token": cookies.csrfCookie,
    },
  });
  assert(withCsrf.status === 200, `Expected 200 with CSRF token, got ${withCsrf.status}`);
}

async function testLoginLockout(baseUrl) {
  let hasLockout = false;
  for (let i = 0; i < 20; i += 1) {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: INVALID_ADMIN_ID, password: "wrong-password" }),
    });
    if (res.status !== 401 && res.status !== 429) {
      const text = await res.text();
      throw new Error(`Unexpected status ${res.status} during failures: ${text}`);
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "0");
      assert(retryAfter > 0, "Expected Retry-After header on lockout response.");
      hasLockout = true;
      break;
    }
  }

  assert(hasLockout, "Expected lockout status 429 but it never occurred within 20 failed attempts.");
}

async function testAdminPageGuard(baseUrl) {
  const response = await fetch(`${baseUrl}/admin`, {
    method: "GET",
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=invalid-session-token`,
    },
    redirect: "manual",
  });

  assert(
    response.status === 307 || response.status === 308,
    `Expected redirect for invalid admin session, got ${response.status}`,
  );
  const location = response.headers.get("location") ?? "";
  assert(location.includes("/admin/login"), `Expected /admin/login redirect, got "${location}"`);
}

async function testSecurityHeaders(baseUrl) {
  const response = await fetch(`${baseUrl}/admin/login`, { method: "GET" });
  assert(response.status === 200, `Expected 200 on /admin/login, got ${response.status}`);
  const csp = response.headers.get("content-security-policy");
  assert(Boolean(csp), "Expected Content-Security-Policy header on page response.");
}

async function stopServer(child) {
  if (process.platform === "win32" && typeof child.pid === "number") {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {
      // fallback below
    }
  }

  child.kill("SIGTERM");
  try {
    await Promise.race([once(child, "exit"), delay(5000)]);
  } catch {
    // noop
  }
}

async function run() {
  await connectDatabase();
  await setupFixtures();

  const externalBaseUrl = process.env.SECURITY_TEST_BASE_URL;
  const port = externalBaseUrl ? null : await findAvailablePort(DEFAULT_PORT);
  const baseUrl = externalBaseUrl ?? `http://127.0.0.1:${port}`;
  let child = null;
  let bootLog = "";

  if (!externalBaseUrl) {
    execSync("npm run build", {
      env: {
        ...process.env,
      },
      stdio: "pipe",
    });

    child = spawn(`npm run start -- -p ${port}`, {
      shell: true,
      env: {
        ...process.env,
        ADMIN_LOGIN_MAX_FAILURES: "3",
        ADMIN_LOGIN_WINDOW_MINUTES: "15",
        ADMIN_LOGIN_LOCKOUT_MINUTES: "15",
      },
      stdio: "pipe",
    });
    child.stdout?.on("data", (chunk) => {
      bootLog += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk) => {
      bootLog += chunk.toString("utf8");
    });
  }

  try {
    const startedAt = Date.now();
    let isReady = false;
    while (Date.now() - startedAt < 120_000) {
      if (await waitUntilReady(baseUrl, 500)) {
        isReady = true;
        break;
      }

      if (child && child.exitCode !== null) {
        if (bootLog.includes("EADDRINUSE")) {
          throw new Error(`Port ${port} is already in use.\n${bootLog}`);
        }
        throw new Error(`Server process exited early.\n${bootLog}`);
      }
    }

    if (!isReady) {
      throw new Error(`Server did not become ready in time.\n${bootLog}`);
    }

    const cookies = await loginAndReadCookies(baseUrl);
    await testSecurityHeaders(baseUrl);
    await testCsrfProtection(baseUrl, cookies);
    await testLoginLockout(baseUrl);
    await testAdminPageGuard(baseUrl);
    console.log("security-e2e: PASS");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n--- server log ---\n${bootLog}`);
  } finally {
    if (child) {
      await stopServer(child);
    }
    await cleanupFixtures();
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("security-e2e: FAIL");
  console.error(error);
  process.exit(1);
});
