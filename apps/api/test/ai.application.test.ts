/**
 * Endpoints 23-25 — /api/application/*
 * routes/ai.application.routes.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { installAiMock, resetAiMock, setAIFailure, setAIResponse } from "./helpers/ai.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized } from "./helpers/http.js";
import { applicationAnswerFixture, applicationMessageFixture, coverLetterFixture } from "./fixtures/ai.js";
import { JOB_DESCRIPTION_TEXT, RESUME_TEXT } from "./fixtures/requests.js";

let user: TestUser;

beforeAll(async () => {
  installAiMock();
  await resetDatabase();
  user = await createUser(app);
});

afterAll(async () => {
  resetAiMock();
  await disconnectDatabase();
});

describe("POST /api/application/cover-letter", () => {
  it("returns a cover letter for a valid request", async () => {
    setAIResponse(coverLetterFixture);

    const res = await request(app)
      .post("/api/application/cover-letter")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Cover letter generated successfully.");
    expect(res.body.data.greeting).toBe(coverLetterFixture.greeting);
  });

  it("rejects a missing resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/application/cover-letter")
        .set(bearer(user.token))
        .send({ jobDescription: JOB_DESCRIPTION_TEXT }),
      400
    );
  });

  it("rejects a missing jobDescription", async () => {
    expectFailure(
      await request(app)
        .post("/api/application/cover-letter")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT }),
      400
    );
  });

  it("rejects an empty body", async () => {
    expectFailure(
      await request(app).post("/api/application/cover-letter").set(bearer(user.token)).send({}),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app)
        .post("/api/application/cover-letter")
        .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });

  it("returns 503 when the model fails", async () => {
    setAIFailure();

    const res = await request(app)
      .post("/api/application/cover-letter")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("AI_UPSTREAM_UNAVAILABLE");
  });
});

describe("POST /api/application/application-message", () => {
  it("returns a message for a valid request", async () => {
    setAIResponse(applicationMessageFixture);

    const res = await request(app)
      .post("/api/application/application-message")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Application message generated successfully.");
    expect(res.body.data.subject).toBe(applicationMessageFixture.subject);
  });

  it("accepts the optional recruiter-context fields", async () => {
    setAIResponse(applicationMessageFixture);

    const res = await request(app)
      .post("/api/application/application-message")
      .set(bearer(user.token))
      .send({
        resume: RESUME_TEXT,
        jobDescription: JOB_DESCRIPTION_TEXT,
        companyName: "Acme",
        jobTitle: "Backend Engineer",
        candidateName: "Jane Doe",
        platform: "LinkedIn",
      });

    expectSuccess(res, 200);
  });

  it("rejects a missing jobDescription", async () => {
    expectFailure(
      await request(app)
        .post("/api/application/application-message")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app)
        .post("/api/application/application-message")
        .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });
});

describe("POST /api/application/application-answer", () => {
  it("returns an answer for a valid request", async () => {
    setAIResponse(applicationAnswerFixture);

    const res = await request(app)
      .post("/api/application/application-answer")
      .set(bearer(user.token))
      .send({
        question: applicationAnswerFixture.question,
        resume: RESUME_TEXT,
        jobDescription: JOB_DESCRIPTION_TEXT,
      });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Application answer generated successfully.");
    expect(res.body.data.answer).toBe(applicationAnswerFixture.answer);
  });

  it("rejects a missing question", async () => {
    expectFailure(
      await request(app)
        .post("/api/application/application-answer")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT }),
      400
    );
  });

  it("rejects a missing resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/application/application-answer")
        .set(bearer(user.token))
        .send({ question: "Why us?", jobDescription: JOB_DESCRIPTION_TEXT }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app)
        .post("/api/application/application-answer")
        .send({ question: "Why us?", resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });
});
