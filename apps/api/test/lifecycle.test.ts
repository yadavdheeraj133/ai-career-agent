/**
 * Endpoints 4-5 and 32-38 (completion coverage).
 *   routes/auth.routes.ts            POST  /auth/forgot-password
 *                                    POST  /auth/reset-password
 *   routes/job-bookmark.route.ts     GET   /api/jobs/bookmarks
 *   routes/job-application.route.ts  GET   /api/jobs/applications
 *                                    PATCH /api/jobs/applications/:id
 *   routes/dashboard.route.ts        GET   /api/dashboard
 *
 * These paths shipped with the Phase 1 backend work but had no test file, so
 * this suite pins their happy paths, validation and auth guards.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser, TEST_PASSWORD, uniqueEmail, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized, expectValidationFailure } from "./helpers/http.js";

let user: TestUser;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser(app);
});

afterAll(async () => {
  await disconnectDatabase();
});

async function seedJob(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/jobs")
    .set(bearer(user.token))
    .send({
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
      description: "TypeScript and PostgreSQL services.",
      source: "LinkedIn",
      url: `https://example.test/seed/${Math.random().toString(36).slice(2)}`,
      ...overrides,
    });

  if (res.status !== 201) {
    throw new Error(`seedJob failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.data as { id: string };
}

async function seedApplication(status = "Applied") {
  const job = await seedJob();

  const res = await request(app)
    .post("/api/jobs/applications")
    .set(bearer(user.token))
    .send({ jobId: job.id, status });

  if (res.status !== 201) {
    throw new Error(`seedApplication failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.data as { id: string; jobId: string };
}

describe("POST /auth/forgot-password", () => {
  it("returns a reset token for a registered email outside production", async () => {
    const res = await request(app)
      .post("/auth/forgot-password")
      .send({ email: user.email });

    expectSuccess(res, 200);
    expect(res.body.message).toContain("reset link");
    expect(res.body.data.resetToken).toBeTypeOf("string");
    expect(res.body.data.resetToken.length).toBeGreaterThanOrEqual(32);
  });

  it("returns a null token for an unknown email without revealing it", async () => {
    const res = await request(app)
      .post("/auth/forgot-password")
      .send({ email: uniqueEmail("ghost") });

    expectSuccess(res, 200);
    expect(res.body.data.resetToken).toBeNull();
  });

  it("rejects an invalid email", async () => {
    const res = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "not-an-email" });

    expectValidationFailure(res);
  });
});

describe("POST /auth/reset-password", () => {
  async function requestToken(): Promise<string> {
    const res = await request(app)
      .post("/auth/forgot-password")
      .send({ email: user.email });

    return res.body.data.resetToken as string;
  }

  it("resets the password so the new one logs in and the old one fails", async () => {
    const token = await requestToken();
    const newPassword = "BrandNewPass123";

    const reset = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword });

    expect(reset.status).toBe(200);
    expect(reset.body.success).toBe(true);
    expect(reset.body.message).toBe("Password has been reset successfully");

    const oldLogin = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });
    expectFailure(oldLogin, 401);

    const newLogin = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.success).toBe(true);
  });

  it("rejects reuse of a single-use token", async () => {
    const token = await requestToken();

    const first = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword: "BrandNewPass123" });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword: "AnotherPass123" });

    expectFailure(second, 400);
    expect(second.body.message).toBe("Invalid or expired reset token");
  });

  it("rejects an unknown token", async () => {
    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: "a".repeat(64), newPassword: "BrandNewPass123" });

    expectFailure(res, 400);
    expect(res.body.message).toBe("Invalid or expired reset token");
  });

  it("rejects a token shorter than the minimum length", async () => {
    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: "short", newPassword: "BrandNewPass123" });

    expectValidationFailure(res);
  });

  it("rejects a too-short new password", async () => {
    const token = await requestToken();

    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token, newPassword: "short" });

    expectValidationFailure(res);
  });
});

describe("GET /api/jobs/bookmarks", () => {
  it("returns an empty list for a fresh user", async () => {
    const res = await request(app)
      .get("/api/jobs/bookmarks")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.count).toBe(0);
    expect(res.body.data.data).toEqual([]);
  });

  it("lists bookmarked jobs with their job payload", async () => {
    const job = await seedJob();

    await request(app)
      .post(`/api/jobs/${job.id}/bookmark`)
      .set(bearer(user.token))
      .send();

    const res = await request(app)
      .get("/api/jobs/bookmarks")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.data[0]).toMatchObject({
      jobId: job.id,
      bookmarked: true,
      job: { title: "Backend Engineer", company: "Acme" },
    });
    expect(res.body.data.data[0].bookmarkedAt).toBeTypeOf("string");
  });

  it("drops the entry once the bookmark is removed", async () => {
    const job = await seedJob();

    await request(app)
      .post(`/api/jobs/${job.id}/bookmark`)
      .set(bearer(user.token))
      .send();
    await request(app)
      .delete(`/api/jobs/${job.id}/bookmark`)
      .set(bearer(user.token));

    const res = await request(app)
      .get("/api/jobs/bookmarks")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.count).toBe(0);
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/api/jobs/bookmarks"));
  });
});

describe("GET /api/jobs/applications", () => {
  it("returns an empty tracker for a fresh user", async () => {
    const res = await request(app)
      .get("/api/jobs/applications")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.count).toBe(0);
    expect(res.body.data.data).toEqual([]);
  });

  it("lists every application for the user", async () => {
    await seedApplication("Applied");
    await seedApplication("Interview");

    const res = await request(app)
      .get("/api/jobs/applications")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.data[0].job).toMatchObject({ title: "Backend Engineer" });
  });

  it("filters by status", async () => {
    await seedApplication("Applied");
    await seedApplication("Offer");

    const res = await request(app)
      .get("/api/jobs/applications?status=Offer")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.data[0].status).toBe("Offer");
  });

  it("rejects an unknown status filter", async () => {
    const res = await request(app)
      .get("/api/jobs/applications?status=Ghosted")
      .set(bearer(user.token));

    expectFailure(res, 400);
    expect(res.body.message).toContain("Applied");
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/api/jobs/applications"));
  });
});

describe("PATCH /api/jobs/applications/:id", () => {
  it("updates status and notes", async () => {
    const application = await seedApplication("Applied");

    const res = await request(app)
      .patch(`/api/jobs/applications/${application.id}`)
      .set(bearer(user.token))
      .send({ status: "Interview", notes: "Phone screen booked." });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Job application updated successfully.");
    expect(res.body.data).toMatchObject({
      id: application.id,
      status: "Interview",
      notes: "Phone screen booked.",
    });
  });

  it("updates only the supplied field", async () => {
    const application = await seedApplication("Applied");

    const res = await request(app)
      .patch(`/api/jobs/applications/${application.id}`)
      .set(bearer(user.token))
      .send({ notes: "Waiting on recruiter." });

    expectSuccess(res, 200);
    expect(res.body.data.status).toBe("Applied");
    expect(res.body.data.notes).toBe("Waiting on recruiter.");
  });

  it("rejects an unknown status", async () => {
    const application = await seedApplication("Applied");

    const res = await request(app)
      .patch(`/api/jobs/applications/${application.id}`)
      .set(bearer(user.token))
      .send({ status: "Ghosted" });

    expectFailure(res, 400);
    expect(res.body.message).toContain("Applied");
  });

  it("rejects non-string notes", async () => {
    const application = await seedApplication("Applied");

    const res = await request(app)
      .patch(`/api/jobs/applications/${application.id}`)
      .set(bearer(user.token))
      .send({ notes: 42 });

    expectFailure(res, 400);
    expect(res.body.message).toBe("notes must be a string.");
  });

  it("returns 404 for an unknown application id", async () => {
    const res = await request(app)
      .patch("/api/jobs/applications/cuid-does-not-exist")
      .set(bearer(user.token))
      .send({ status: "Offer" });

    expectFailure(res, 404);
    expect(res.body.message).toBe("Application not found");
  });

  it("requires authentication", async () => {
    const application = await seedApplication("Applied");

    expectUnauthorized(
      await request(app)
        .patch(`/api/jobs/applications/${application.id}`)
        .send({ status: "Offer" })
    );
  });
});

describe("GET /api/dashboard", () => {
  it("summarises a fresh account", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.profile).toMatchObject({
      id: user.id,
      email: user.email,
    });
    expect(res.body.data.resume).toMatchObject({ exists: false, skillsCount: 0 });
    expect(res.body.data.jobs).toMatchObject({ total: 0, saved: 0 });
    expect(res.body.data.applications).toEqual({ total: 0, byStatus: {} });
    expect(res.body.data.preferences).toEqual({ exists: false });
    expect(res.body.data.settings).toEqual({ exists: false });
  });

  it("reflects saved jobs and applications", async () => {
    const savedJob = await seedJob();
    const appliedJob = await seedJob({ url: "https://example.test/seed/applied" });

    await request(app)
      .post(`/api/jobs/${savedJob.id}/bookmark`)
      .set(bearer(user.token))
      .send();
    await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ jobId: savedJob.id, status: "Interview" });
    await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ jobId: appliedJob.id, status: "Applied" });

    const res = await request(app)
      .get("/api/dashboard")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.jobs).toMatchObject({ total: 2, saved: 1 });
    expect(res.body.data.applications.total).toBe(2);
    expect(res.body.data.applications.byStatus).toEqual({ Interview: 1, Applied: 1 });
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/api/dashboard"));
  });
});
