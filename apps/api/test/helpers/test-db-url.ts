import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** apps/api — the package root, used to locate .env and run the Prisma CLI. */
export const API_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

/** Only databases whose name ends with this may be truncated by the suite. */
export const TEST_DB_SUFFIX = "_test";

function readEnvFileValue(file: string, key: string): string | undefined {
  try {
    const raw = readFileSync(resolve(API_ROOT, file), "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);

      if (match && match[1] === key) {
        return match[2].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {
    // The file is optional — CI may supply everything via the environment.
  }

  return undefined;
}

export function databaseName(url: string): string {
  const name = new URL(url).pathname.replace(/^\//, "");
  return decodeURIComponent(name);
}

/**
 * Guard rail. The suite calls `deleteMany()` on every table, so refuse to run
 * against anything that is not an explicitly-named test database. This is what
 * stops a stray DATABASE_URL from wiping the development database.
 */
export function assertIsTestDatabase(url: string): void {
  const name = databaseName(url);

  if (!name.endsWith(TEST_DB_SUFFIX)) {
    throw new Error(
      [
        "",
        `REFUSING TO RUN: resolved database "${name}" does not end with "${TEST_DB_SUFFIX}".`,
        "The API test suite truncates every table, so it only runs against a",
        "dedicated test database.",
        "",
        "Fix by setting TEST_DATABASE_URL, e.g.",
        `  TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/${name}${TEST_DB_SUFFIX}`,
        "",
      ].join("\n")
    );
  }
}

/**
 * Resolve the database the suite runs against.
 *
 * 1. `TEST_DATABASE_URL` from the environment.
 * 2. `TEST_DATABASE_URL` from an optional `apps/api/.env.test` (git-ignored).
 * 3. Otherwise derived from `DATABASE_URL` by appending `_test` to the database
 *    name — this avoids copying credentials into an extra tracked file.
 */
export function resolveTestDatabaseUrl(): string {
  const explicit =
    process.env.TEST_DATABASE_URL?.trim() ||
    readEnvFileValue(".env.test", "TEST_DATABASE_URL");

  const url = explicit || deriveFromBaseUrl();

  assertIsTestDatabase(url);

  return url;
}

function deriveFromBaseUrl(): string {
  const base =
    process.env.DATABASE_URL?.trim() ||
    readEnvFileValue(".env", "DATABASE_URL");

  if (!base) {
    throw new Error(
      [
        "",
        "No database configured for the test suite.",
        "",
        "Set TEST_DATABASE_URL (preferred), or DATABASE_URL so it can be derived:",
        "  TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/career_agent_test",
        "",
      ].join("\n")
    );
  }

  const parsed = new URL(base);
  const name = databaseName(base);

  if (!name) {
    throw new Error(`Could not determine a database name from "${base}".`);
  }

  parsed.pathname = `/${name}${TEST_DB_SUFFIX}`;

  return parsed.toString();
}

/** Connection string for the maintenance database, used to CREATE the test DB. */
export function maintenanceUrl(url: string): string {
  const parsed = new URL(url);
  parsed.pathname = "/postgres";
  return parsed.toString();
}
