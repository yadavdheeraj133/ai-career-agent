/**
 * One-time test environment provisioning, executed once in the main Vitest
 * process before any test file runs.
 *
 * Responsibilities:
 *   1. Resolve and safety-check the test database URL.
 *   2. Create the test database if it does not exist yet.
 *   3. Apply the repository's existing Prisma migrations to it.
 *
 * The development database is never touched: the URL is validated to end in
 * `_test` before any connection is opened, and migrations are run with
 * DATABASE_URL overridden in the child process environment only.
 */
import { spawnSync } from "node:child_process";
import pg from "pg";

import {
  API_ROOT,
  databaseName,
  maintenanceUrl,
  resolveTestDatabaseUrl,
} from "../helpers/test-db-url.js";

export default async function globalSetup(): Promise<void> {
  const testDatabaseUrl = resolveTestDatabaseUrl();
  const name = databaseName(testDatabaseUrl);

  await ensureDatabaseExists(testDatabaseUrl, name);
  applyMigrations(testDatabaseUrl);

  console.log(`\n✅ API test database ready: ${name}\n`);
}

async function ensureDatabaseExists(
  testDatabaseUrl: string,
  name: string
): Promise<void> {
  const client = new pg.Client({
    connectionString: maintenanceUrl(testDatabaseUrl),
  });

  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      [
        "",
        "Could not connect to PostgreSQL to provision the test database.",
        "",
        `  Target database : ${name}`,
        `  Reason          : ${(error as Error).message}`,
        "",
        "The suite needs a reachable PostgreSQL server. Either:",
        "  • start your local PostgreSQL service, or",
        "  • point TEST_DATABASE_URL at a reachable test server, e.g.",
        "      TEST_DATABASE_URL=postgresql://user:pass@host:5432/career_agent_test",
        "",
        "Note: the database name must end with '_test'.",
        "",
      ].join("\n")
    );
  }

  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [name]
    );

    if (existing.rowCount === 0) {
      // Identifier is interpolated because CREATE DATABASE cannot be
      // parameterised; `name` is already restricted by the _test guard.
      await client.query(`CREATE DATABASE "${name}"`);
      console.log(`   created database "${name}"`);
    }
  } finally {
    await client.end();
  }
}

function applyMigrations(testDatabaseUrl: string): void {
  const result = spawnSync("pnpm exec prisma migrate deploy", {
    cwd: API_ROOT,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    shell: true,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      [
        "",
        "Failed to apply Prisma migrations to the test database.",
        "",
        `  stdout: ${result.stdout ?? ""}`,
        `  stderr: ${result.stderr ?? ""}`,
        "",
        "Try running it manually:",
        "  cd apps/api",
        `  DATABASE_URL="<test url>" pnpm exec prisma migrate deploy`,
        "",
      ].join("\n")
    );
  }
}
