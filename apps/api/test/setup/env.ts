/**
 * Test environment bootstrap.
 *
 * Vitest executes `setupFiles` before evaluating the test file's module graph.
 * Application modules are imported lazily (via `../src/app.js`) from that graph,
 * so assigning here is what makes the Prisma singleton open the *test* database.
 *
 * `src/lib/prisma.ts` calls `dotenv.config()`, and dotenv deliberately does not
 * overwrite variables that are already set — so everything below wins over
 * apps/api/.env.
 */
import { resolveTestDatabaseUrl } from "../helpers/test-db-url.js";

const testDatabaseUrl = resolveTestDatabaseUrl();

process.env.NODE_ENV = "test";

// The API's own env loader requires PORT to be present at import time.
process.env.PORT = process.env.PORT ?? "5099";

// Never the developer's real signing key: tokens minted here are worthless
// outside the test run, and no production secret is read or copied.
process.env.JWT_SECRET = "test-only-jwt-secret-do-not-use-in-production";

process.env.DATABASE_URL = testDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl;

// The AgentRouter provider validates these eagerly in its constructor. They
// must look configured for AI routes to reach the (mocked) fetch boundary.
// Nothing here points at a real service — see test/helpers/ai.ts.
process.env.AI_PROVIDER = "agent-router";
process.env.AGENT_ROUTER_BASE_URL = "http://agent-router.invalid/v1";
process.env.AGENT_ROUTER_API_KEY = "test-api-key";
process.env.AGENT_ROUTER_MODEL = "test-model";
process.env.AGENT_ROUTER_TIMEOUT_MS = "5000";

// LinkedIn OAuth — dummy values for tests (real calls are mocked or never made).
process.env.LINKEDIN_CLIENT_ID = "test-linkedin-client-id";
process.env.LINKEDIN_CLIENT_SECRET = "test-linkedin-client-secret";
process.env.LINKEDIN_REDIRECT_URI = "http://localhost:5099/auth/linkedin/callback";
process.env.FRONTEND_URL = "http://localhost:3000";
