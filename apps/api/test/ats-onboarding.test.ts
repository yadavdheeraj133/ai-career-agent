/**
 * Onboarding ATS gate — Task 7.
 *
 * POST /resume/ats-check runs the existing ATS analysis against the
 * authenticated user's stored resume text, persists the score, and reports
 * whether the 85% onboarding threshold is met.
 * GET /resume/ats-status exposes the persisted gate state.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import app from "../src/app.js";
import { ATS_PASS_THRESHOLD } from "../src/services/ats-onboarding.service.js";
import { installAiMock, resetAiMock, setAIFailure, setAIResponse } from "./helpers/ai.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";
import { atsFixture } from "./fixtures/ai.js";
import { JOB_DESCRIPTION_TEXT } from "./fixtures/requests.js";

const RESUME_TEXT =
  "Jane Doe — Backend Engineer with five years of TypeScript and PostgreSQL.";
const uploadFixture = path.join(
  "node_modules",
  "mammoth",
  "test",
  "test-data",
  "single-paragraph.docx"
);

let user: TestUser;

beforeAll(async () => {
  installAiMock();
});

afterAll(async () => {
  resetAiMock();
  await disconnectDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  user = await createUser(app);
});

async function seedResume(userId: string, rawText = RESUME_TEXT) {
  return prisma.resume.create({
    data: { userId, title: "Seeded Resume", rawText },
  });
}

describe("GET /resume/ats-status", () => {
  it("reports no resume for a fresh user", async () => {
    const res = await request(app).get("/resume/ats-status").set(bearer(user.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      hasResume: false,
      atsScore: null,
      atsCheckedAt: null,
      passed: false,
      threshold: ATS_PASS_THRESHOLD,
    });
    expect(ATS_PASS_THRESHOLD).toBe(85);
  });

  it("requires authentication", async () => {
    await request(app).get("/resume/ats-status").expect(401);
  });

  it("does not leak another user's gate state", async () => {
    const other = await createUser(app);
    await seedResume(user.id);
    setAIResponse({ ...atsFixture, overallScore: 92 });

    await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT })
      .expect(200);

    const res = await request(app)
      .get("/resume/ats-status")
      .set(bearer(other.token));

    expect(res.body.data).toMatchObject({ hasResume: false, passed: false });
  });
});

describe("POST /resume/ats-check", () => {
  it("persists a passing score and reports passed=true", async () => {
    await seedResume(user.id);
    setAIResponse({ ...atsFixture, overallScore: 90 });

    const res = await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      hasResume: true,
      atsScore: 90,
      passed: true,
      threshold: 85,
    });
    expect(res.body.data.atsCheckedAt).toEqual(expect.any(String));

    const stored = await prisma.resume.findUnique({ where: { userId: user.id } });
    expect(stored?.atsScore).toBe(90);
    expect(stored?.atsCheckedAt).toBeInstanceOf(Date);
    expect(stored?.atsResult).toMatchObject({ overallScore: 90 });
  });

  it("persists a failing score and reports passed=false", async () => {
    await seedResume(user.id);
    setAIResponse({ ...atsFixture, overallScore: 70 });

    const res = await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ atsScore: 70, passed: false });

    const stored = await prisma.resume.findUnique({ where: { userId: user.id } });
    expect(stored?.atsScore).toBe(70);
  });

  it("returns 404 when the user has no resume", async () => {
    setAIResponse({ ...atsFixture, overallScore: 95 });

    const res = await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT });

    expect(res.status).toBe(404);
  });

  it("rejects a missing jobDescription with 400", async () => {
    await seedResume(user.id);

    await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({})
      .expect(400);
  });

  it("returns 500 when ATS processing fails", async () => {
    await seedResume(user.id);
    setAIFailure();

    const res = await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT });

    expect(res.status).toBe(500);

    const stored = await prisma.resume.findUnique({ where: { userId: user.id } });
    expect(stored?.atsScore).toBeNull();
  });

  it("updates rather than duplicates state on repeat checks", async () => {
    await seedResume(user.id);
    setAIResponse({ ...atsFixture, overallScore: 72 });

    await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT })
      .expect(200);

    setAIResponse({ ...atsFixture, overallScore: 91 });

    const second = await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT })
      .expect(200);

    expect(second.body.data).toMatchObject({ atsScore: 91, passed: true });
    expect(await prisma.resume.count({ where: { userId: user.id } })).toBe(1);
  });

  it("requires authentication", async () => {
    await request(app)
      .post("/resume/ats-check")
      .send({ jobDescription: JOB_DESCRIPTION_TEXT })
      .expect(401);
  });
});

describe("ATS gate lifecycle", () => {
  it("survives refresh and logout/login via persisted state", async () => {
    await seedResume(user.id);
    setAIResponse({ ...atsFixture, overallScore: 88 });

    await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT })
      .expect(200);

    // Refresh: a fresh GET returns the same persisted state.
    const refreshed = await request(app)
      .get("/resume/ats-status")
      .set(bearer(user.token))
      .expect(200);
    expect(refreshed.body.data).toMatchObject({ atsScore: 88, passed: true });

    // Logout/login: re-authenticate and the state is still there.
    const login = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "TestPass123" })
      .expect(200);

    const afterLogin = await request(app)
      .get("/resume/ats-status")
      .set(bearer(login.body.data.token))
      .expect(200);
    expect(afterLogin.body.data).toMatchObject({ atsScore: 88, passed: true });
  });

  it("a resume re-upload clears the previous ATS state", async () => {
    const file = await readFile(uploadFixture);

    await request(app)
      .post("/resume/upload")
      .set(bearer(user.token))
      .attach("file", file, "resume.docx")
      .expect(200);

    setAIResponse({ ...atsFixture, overallScore: 93 });

    await request(app)
      .post("/resume/ats-check")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT })
      .expect(200);

    // Replace the resume: the stale passing score must not survive.
    await request(app)
      .post("/resume/upload")
      .set(bearer(user.token))
      .attach("file", file, "resume.docx")
      .expect(200);

    const status = await request(app)
      .get("/resume/ats-status")
      .set(bearer(user.token))
      .expect(200);

    expect(status.body.data).toMatchObject({
      hasResume: true,
      atsScore: null,
      passed: false,
    });
  });
});
