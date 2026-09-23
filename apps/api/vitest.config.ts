import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the AI Career Agent API.
 *
 * Vitest was chosen over Jest because this package is native ESM
 * ("type": "module" with explicit ".js" import specifiers pointing at ".ts"
 * sources). Vite resolves that convention natively, so no transform or
 * module-mapping configuration is required.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",

    include: ["test/**/*.test.ts"],

    // Runs inside every test worker BEFORE the test file's module graph is
    // evaluated. That ordering is what lets us redirect the Prisma singleton
    // at the test database (see test/setup/env.ts).
    setupFiles: ["./test/setup/env.ts"],

    // Runs once in the main process: provisions the test database and applies
    // Prisma migrations. See test/setup/global-setup.ts.
    globalSetup: ["./test/setup/global-setup.ts"],

    // Every suite truncates the same Postgres database between tests, so files
    // must not run concurrently or they would clobber each other's fixtures.
    fileParallelism: false,
    isolate: true,

    testTimeout: 30_000,
    hookTimeout: 60_000,

    // The AI domain services log full prompt/response payloads. That is useful
    // when debugging a single failure but drowns the suite output, so route it
    // behind DEBUG_AI_TESTS.
    onConsoleLog(log, type) {
      if (process.env.DEBUG_AI_TESTS) return;
      const noisy =
        /\b(AI RESPONSE|RAW RESPONSE|PARSED RESPONSE|AGENT ROUTER|Generation)\b/.test(
          log
        );
      if (noisy || (type === "stdout" && log.trim().startsWith("{"))) {
        return false;
      }
    },
  },
});
