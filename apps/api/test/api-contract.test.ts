/**
 * Cross-cutting contract for every route in `src/routes/**`.
 *
 * The per-feature suites assert the behaviour each endpoint is supposed to
 * have. This file asserts the things that must hold for *all* of them, so a new
 * route that forgets authentication, or a request that is not valid JSON, is
 * caught once here rather than per endpoint:
 *
 *   1. The endpoint inventory is complete and every protected route 401s.
 *   2. No endpoint answers a malformed or absent body with a 5xx.
 *   3. Endpoints that consume a JSON body reject an absent one with a 4xx
 *      rather than crashing on `undefined`.
 *   4. Unknown routes and unsupported methods answer in the same envelope.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectUnauthorized } from "./helpers/http.js";

type Method = "get" | "post" | "patch" | "delete";

interface Endpoint {
  method: Method;
  path: string;
  /** Reachable without a token. */
  public?: boolean;
  /**
   * The route's contract is to consume a JSON body, so an absent or
   * unparseable one must be rejected as a 4xx client error.
   */
  consumesBody?: boolean;
  /** Answers with a redirect (the LinkedIn OAuth dance). */
  redirect?: boolean;
  group: string;
}

const E = (
  method: Method,
  path: string,
  group: string,
  extra: Partial<Endpoint> = {},
): Endpoint => ({ method, path, group, ...extra });

const ENDPOINTS: Endpoint[] = [
  // ---- auth -------------------------------------------------------------
  E("post", "/auth/register", "auth", { public: true, consumesBody: true }),
  E("post", "/auth/login", "auth", { public: true, consumesBody: true }),
  E("post", "/auth/forgot-password", "auth", { public: true, consumesBody: true }),
  E("post", "/auth/reset-password", "auth", { public: true, consumesBody: true }),
  E("post", "/auth/change-password", "auth", { consumesBody: true }),
  E("get", "/auth/linkedin", "auth", { public: true, redirect: true }),
  E("get", "/auth/linkedin/callback", "auth", { public: true, redirect: true }),
  E("get", "/auth/me", "auth"),

  // ---- users ------------------------------------------------------------
  E("get", "/users/profile", "users"),
  E("patch", "/users/profile", "users"),
  E("delete", "/users/profile", "users"),

  // ---- resume (structured CRUD) ----------------------------------------
  E("post", "/resume", "resume", { consumesBody: true }),
  E("get", "/resume", "resume"),
  E("patch", "/resume", "resume", { consumesBody: true }),
  E("delete", "/resume", "resume"),

  // ---- resume (upload + ATS gate) ---------------------------------------
  E("post", "/resume/upload", "resume-upload", { consumesBody: true }),
  E("get", "/resume/file", "resume-upload"),
  E("get", "/resume/ats-status", "resume-upload"),
  E("post", "/resume/ats-check", "resume-upload", { consumesBody: true }),

  // ---- resume (non-tailored template generation) -------------------------
  E("post", "/resume/generate", "resume-generate"),
  E("post", "/resume/generate/download", "resume-generate"),

  // ---- job catalogue CRUD ----------------------------------------------
  E("post", "/jobs", "jobs", { consumesBody: true }),
  E("get", "/jobs", "jobs"),
  E("get", "/jobs/some-id", "jobs"),
  E("patch", "/jobs/some-id", "jobs", { consumesBody: true }),
  E("delete", "/jobs/some-id", "jobs"),

  // ---- AI: resume -------------------------------------------------------
  E("post", "/api/resume/analyze", "ai", { consumesBody: true }),
  E("post", "/api/resume/ats", "ai", { consumesBody: true }),
  E("post", "/api/resume/skill-gap", "ai", { consumesBody: true }),
  E("post", "/api/resume/tailor", "ai", { consumesBody: true }),
  E("post", "/api/resume/job-match", "ai", { consumesBody: true }),
  E("post", "/api/resume/ai-verdict", "ai", { consumesBody: true }),
  E("post", "/api/resume/interview-probability", "ai", { consumesBody: true }),

  // ---- AI: application --------------------------------------------------
  E("post", "/api/application/cover-letter", "ai", { consumesBody: true }),
  E("post", "/api/application/application-message", "ai", { consumesBody: true }),
  E("post", "/api/application/application-answer", "ai", { consumesBody: true }),

  // ---- AI: interview ----------------------------------------------------
  E("post", "/api/interview/prepare", "ai", { consumesBody: true }),
  E("post", "/api/interview/job-summary", "ai", { consumesBody: true }),
  E("post", "/api/interview/company-insight", "ai", { consumesBody: true }),

  // ---- AI: career -------------------------------------------------------
  E("post", "/api/career/coach", "ai", { consumesBody: true }),
  E("post", "/api/career/roadmap", "ai", { consumesBody: true }),
  E("post", "/api/career/learning-path", "ai", { consumesBody: true }),

  // ---- jobs: ingestion, search, matching --------------------------------
  E("post", "/api/jobs/aggregate", "job-intelligence", { consumesBody: true }),
  E("get", "/api/jobs/search", "job-intelligence"),
  E("post", "/api/jobs/match", "job-intelligence", { consumesBody: true }),

  // ---- jobs: bookmarks --------------------------------------------------
  E("get", "/api/jobs/bookmarks", "bookmarks"),
  E("post", "/api/jobs/some-id/bookmark", "bookmarks"),
  E("delete", "/api/jobs/some-id/bookmark", "bookmarks"),

  // ---- jobs: applications -----------------------------------------------
  E("post", "/api/jobs/applications", "applications", { consumesBody: true }),
  E("get", "/api/jobs/applications", "applications"),
  E("patch", "/api/jobs/applications/some-id", "applications"),
  E("get", "/api/jobs/applications/some-id", "applications"),

  // ---- preferences ------------------------------------------------------
  E("get", "/api/preferences", "preferences"),
  E("post", "/api/preferences", "preferences"),
  E("patch", "/api/preferences", "preferences", { consumesBody: true }),

  // ---- settings ---------------------------------------------------------
  E("get", "/users/settings", "settings"),
  E("post", "/users/settings", "settings"),
  E("patch", "/users/settings", "settings", { consumesBody: true }),

  // ---- dashboard / notifications / skills -------------------------------
  E("get", "/api/dashboard", "dashboard"),
  E("get", "/api/notifications", "notifications"),
  E("delete", "/api/notifications", "notifications"),
  E("post", "/api/notifications/read-all", "notifications"),
  E("patch", "/api/notifications/some-id/read", "notifications"),
  E("get", "/api/skills", "skills"),
  E("post", "/api/skills", "skills", { consumesBody: true }),
  E("delete", "/api/skills/some-id", "skills"),
];

function label(endpoint: Endpoint): string {
  return `${endpoint.method.toUpperCase()} ${endpoint.path}`;
}

function call(endpoint: Endpoint) {
  return (
    request(app) as never as Record<string, (p: string) => request.Test>
  )[endpoint.method]!(endpoint.path);
}

/** 204 No Content and 302 redirects legitimately carry no JSON body. */
function isBodyless(status: number): boolean {
  return status === 204 || status === 304 || status === 302;
}

let user: TestUser;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser(app);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("endpoint inventory", () => {
  it("covers all 66 routes in the routers", () => {
    // Guards the inventory itself: adding or removing a route has to be
    // reconciled here rather than silently drifting.
    expect(ENDPOINTS).toHaveLength(66);
  });

  it("has no duplicate method + path entries", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const endpoint of ENDPOINTS) {
      const key = label(endpoint);
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }

    expect(duplicates).toEqual([]);
  });

  it("classifies every endpoint", () => {
    for (const endpoint of ENDPOINTS) {
      expect(endpoint.group, `${label(endpoint)} needs a group`).toBeTypeOf("string");
    }
  });
});

describe("authentication is required on every protected endpoint", () => {
  for (const endpoint of ENDPOINTS.filter((e) => !e.public)) {
    it(`401s an unauthenticated ${label(endpoint)}`, async () => {
      const res = await call(endpoint);

      expectUnauthorized(res);
      expect(res.type).toBe("application/json");
      expect(res.body.success).toBe(false);
    });

    it(`401s a forged token on ${label(endpoint)}`, async () => {
      const res = await call(endpoint).set(bearer("not.a.jwt"));

      expectUnauthorized(res);
      expect(res.body.message).toBe("Invalid or expired token");
    });

    it(`401s a token whose user was deleted on ${label(endpoint)}`, async () => {
      const throwaway = await createUser(app);
      await request(app)
        .delete("/users/profile")
        .set(bearer(throwaway.token))
        .expect(200);

      const res = await call(endpoint).set(bearer(throwaway.token));

      expectUnauthorized(res);
      expect(res.body.message).toBe("User not found");
    });
  }
});

describe("a request with no parseable JSON body never produces a server error", () => {
  for (const endpoint of ENDPOINTS) {
    it(`does not 5xx on ${label(endpoint)} with no body`, async () => {
      const res = await call(endpoint).set(bearer(user.token));

      expect(res.status).toBeLessThan(500);
      if (!isBodyless(res.status)) {
        expect(res.body).toBeTypeOf("object");
        expect(res.body.success).toBeTypeOf("boolean");
      }
      if (endpoint.consumesBody) {
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBeTypeOf("string");
      }
    });

    it(`does not 5xx on ${label(endpoint)} with a non-JSON content type`, async () => {
      const res = await call(endpoint)
        .set(bearer(user.token))
        .set("Content-Type", "text/plain")
        .send("this is not json");

      expect(res.status).toBeLessThan(500);
      if (!isBodyless(res.status)) {
        expect(res.body).toBeTypeOf("object");
        expect(res.body.success).toBeTypeOf("boolean");
      }
      if (endpoint.consumesBody) {
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBeTypeOf("string");
      }
    });
  }
});

describe("malformed request bodies", () => {
  it("answers a truncated JSON body as 400 JSON, never an HTML stack trace", async () => {
    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(user.token))
      .set("Content-Type", "application/json")
      .send('{"resume": ');

    expect(res.status).toBe(400);
    expect(res.type).toBe("application/json");
    expect(res.body.success).toBe(false);
    expect(res.text).not.toContain("SyntaxError");
    expect(res.text).not.toContain("at JSON.parse");
  });

  it("answers a body that is not valid JSON at all as 400 JSON", async () => {
    const res = await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .set("Content-Type", "application/json")
      .send("{oops");

    expect(res.status).toBe(400);
    expect(res.type).toBe("application/json");
    expect(res.body.success).toBe(false);
  });

  it("answers a JSON array where an object is expected as 4xx JSON", async () => {
    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(user.token))
      .set("Content-Type", "application/json")
      .send("[1,2,3]");

    expect(res.type).toBe("application/json");
    expect(res.status).toBe(400);
  });

  it("answers an oversized body as 413 JSON without echoing a stack trace", async () => {
    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(user.token))
      .send({ resume: "x".repeat(2 * 1024 * 1024) });

    expect(res.status).toBe(413);
    expect(res.type).toBe("application/json");
    expect(res.body.success).toBe(false);
    expect(res.text).not.toContain("PayloadTooLargeError");
  });
});

describe("unknown routes and methods", () => {
  it("answers an unknown path with the JSON 404 envelope", async () => {
    const res = await request(app).get("/no-such-endpoint");

    expect(res.status).toBe(404);
    expect(res.type).toBe("application/json");
    expect(res.body).toMatchObject({ success: false, data: null });
  });

  it("answers an unsupported method with the JSON 404 envelope", async () => {
    for (const [method, path] of [
      ["put", "/api/skills"],
      ["put", "/auth/login"],
      ["patch", "/auth/me"],
    ] as const) {
      const res = await (
        request(app) as never as Record<string, (p: string) => request.Test>
      )[method]!(path).set(bearer(user.token));

      expectFailure(res, 404);
      expect(res.type).toBe("application/json");
    }
  });

  it("does not resolve a path traversal outside the API surface", async () => {
    const res = await request(app).get("/jobs/../../etc/passwd");

    expect(res.status).toBe(404);
    expect(res.type).toBe("application/json");
    expect(res.text).not.toContain("root:");
  });
});
