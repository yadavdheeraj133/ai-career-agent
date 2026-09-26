/**
 * Endpoints 26-28 — /api/interview/*
 * routes/ai.interview.routes.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { installAiMock, resetAiMock, setAIFailure, setAIResponse } from "./helpers/ai.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized } from "./helpers/http.js";
import { companyInsightFixture, interviewPreparationFixture, jobSummaryFixture } from "./fixtures/ai.js";
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

describe("POST /api/interview/prepare", () => {
  it("returns an interview plan for a valid request", async () => {
    setAIResponse(interviewPreparationFixture);

    const res = await request(app)
      .post("/api/interview/prepare")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Interview preparation generated successfully.");
    expect(res.body.data.interviewDifficulty).toBe(interviewPreparationFixture.interviewDifficulty);
    expect(res.body.data.technicalQuestions).toHaveLength(1);
  });

  it("rejects a missing resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/interview/prepare")
        .set(bearer(user.token))
        .send({ jobDescription: JOB_DESCRIPTION_TEXT }),
      400
    );
  });

  it("rejects a missing jobDescription", async () => {
    expectFailure(
      await request(app)
        .post("/api/interview/prepare")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT }),
      400
    );
  });

  it("rejects an empty body", async () => {
    expectFailure(
      await request(app).post("/api/interview/prepare").set(bearer(user.token)).send({}),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app)
        .post("/api/interview/prepare")
        .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });

  it("returns 503 when the model fails", async () => {
    setAIFailure();

    const res = await request(app)
      .post("/api/interview/prepare")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("AI_UPSTREAM_UNAVAILABLE");
  });
});

describe("POST /api/interview/job-summary", () => {
  it("returns a summary for a valid request", async () => {
    setAIResponse(jobSummaryFixture);

    const res = await request(app)
      .post("/api/interview/job-summary")
      .set(bearer(user.token))
      .send({ jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Job summary generated successfully.");
    expect(res.body.data.jobTitle).toBe(jobSummaryFixture.jobTitle);
  });

  it("rejects a missing jobDescription", async () => {
    expectFailure(
      await request(app).post("/api/interview/job-summary").set(bearer(user.token)).send({}),
      400
    );
  });

  it("rejects a non-string jobDescription", async () => {
    expectFailure(
      await request(app)
        .post("/api/interview/job-summary")
        .set(bearer(user.token))
        .send({ jobDescription: ["nope"] }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/interview/job-summary").send({ jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });
});

describe("POST /api/interview/company-insight", () => {
  it("returns company research for a valid request", async () => {
    setAIResponse(companyInsightFixture);

    const res = await request(app)
      .post("/api/interview/company-insight")
      .set(bearer(user.token))
      .send({ companyInformation: "Acme is a fintech company." });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Company insight generated successfully.");
    expect(res.body.data.companyName).toBe(companyInsightFixture.companyName);
  });

  it("rejects a missing companyInformation", async () => {
    expectFailure(
      await request(app).post("/api/interview/company-insight").set(bearer(user.token)).send({}),
      400
    );
  });

  it("rejects a blank companyInformation", async () => {
    expectFailure(
      await request(app)
        .post("/api/interview/company-insight")
        .set(bearer(user.token))
        .send({ companyInformation: "" }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/interview/company-insight").send({ companyInformation: "Acme" })
    );
  });
});
