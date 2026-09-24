/**
 * Endpoints 16-22 — /api/resume/*
 * routes/ai.resume.route.ts
 *
 * The AI endpoints are stateless: none of them touch the database. The language
 * model is the only external dependency and is stubbed at the `fetch` boundary
 * (test/helpers/ai.ts), so prompt building, response parsing, and Zod response
 * validation all still execute for real.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { aiCallCount, installAiMock, resetAiMock, setAIFailure, setAIResponse, setAIRawContent } from "./helpers/ai.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized } from "./helpers/http.js";
import {
  aiVerdictFixture,
  atsFixture,
  interviewProbabilityFixture,
  resumeAnalysisFixture,
  resumeJobMatchFixture,
  resumeTailorFixture,
  skillGapFixture,
} from "./fixtures/ai.js";
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

describe("POST /api/resume/analyze", () => {
  it("returns the parsed analysis for a valid request", async () => {
    setAIResponse(resumeAnalysisFixture);

    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Resume analyzed successfully.");
    expect(res.body.data.overallScore).toBe(resumeAnalysisFixture.overallScore);
  });

  it("rejects a missing resume", async () => {
    expectFailure(
      await request(app).post("/api/resume/analyze").set(bearer(user.token)).send({}),
      400
    );
  });

  it("rejects an empty-string resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/resume/analyze")
        .set(bearer(user.token))
        .send({ resume: "   " }),
      400
    );
  });

  it("rejects a non-string resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/resume/analyze")
        .set(bearer(user.token))
        .send({ resume: 42 }),
      400
    );
  });

  it("does not call the model when validation fails", async () => {
    const before = aiCallCount();

    await request(app).post("/api/resume/analyze").set(bearer(user.token)).send({});

    expect(aiCallCount()).toBe(before);
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/resume/analyze").send({ resume: RESUME_TEXT })
    );
  });

  it("returns 500 when the model is unreachable", async () => {
    setAIFailure();

    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("returns 500 when the model returns malformed JSON", async () => {
    setAIRawContent("this is not json");

    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT });

    expect(res.status).toBe(500);
  });

  it("returns 500 when the model output violates the response schema", async () => {
    // Valid JSON, but overallScore is out of the 0-100 range.
    setAIResponse({ ...resumeAnalysisFixture, overallScore: 500 });

    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT });

    expect(res.status).toBe(500);
  });

  it("tolerates a response wrapped in a markdown code fence", async () => {
    setAIRawContent("```json\n" + JSON.stringify(resumeAnalysisFixture) + "\n```");

    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT });

    expectSuccess(res, 200);
  });
});

describe("POST /api/resume/ats", () => {
  it("returns the ATS breakdown for a valid request", async () => {
    setAIResponse(atsFixture);

    const res = await request(app)
      .post("/api/resume/ats")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("ATS analysis completed successfully.");
    expect(res.body.data.overallScore).toBe(atsFixture.overallScore);
    expect(res.body.data.sectionAnalysis).toBeTypeOf("object");
  });

  it("rejects a missing jobDescription", async () => {
    expectFailure(
      await request(app)
        .post("/api/resume/ats")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT }),
      400
    );
  });

  it("rejects a missing resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/resume/ats")
        .set(bearer(user.token))
        .send({ jobDescription: JOB_DESCRIPTION_TEXT }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app)
        .post("/api/resume/ats")
        .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });

  it("returns 500 when the model fails", async () => {
    setAIFailure();

    const res = await request(app)
      .post("/api/resume/ats")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expect(res.status).toBe(500);
  });
});

describe("POST /api/resume/skill-gap", () => {
  it("returns the skill gap for a valid request", async () => {
    setAIResponse(skillGapFixture);

    const res = await request(app)
      .post("/api/resume/skill-gap")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Skill gap analysis completed successfully.");
    expect(res.body.data.overallSkillMatch).toBe(skillGapFixture.overallSkillMatch);
  });

  it("rejects a missing jobDescription", async () => {
    expectFailure(
      await request(app)
        .post("/api/resume/skill-gap")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/resume/skill-gap").send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });
});

describe("POST /api/resume/tailor", () => {
  it("returns a tailored resume for a valid request", async () => {
    setAIResponse(resumeTailorFixture);

    const res = await request(app)
      .post("/api/resume/tailor")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Resume tailored successfully.");
    expect(res.body.data.title).toBe(resumeTailorFixture.title);
    expect(res.body.data.improvementSummary).toBeTypeOf("object");
  });

  it("rejects an empty body", async () => {
    expectFailure(
      await request(app).post("/api/resume/tailor").set(bearer(user.token)).send({}),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/resume/tailor").send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });
});

describe("POST /api/resume/job-match", () => {
  it("returns the match analysis for a valid request", async () => {
    setAIResponse(resumeJobMatchFixture);

    const res = await request(app)
      .post("/api/resume/job-match")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Resume and job match analysis completed successfully.");
    expect(res.body.data.overallMatch).toBe(resumeJobMatchFixture.overallMatch);
  });

  it("rejects a missing resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/resume/job-match")
        .set(bearer(user.token))
        .send({ jobDescription: JOB_DESCRIPTION_TEXT }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/resume/job-match").send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });
});

describe("POST /api/resume/ai-verdict", () => {
  it("returns the verdict for a valid request", async () => {
    setAIResponse(aiVerdictFixture);

    const res = await request(app)
      .post("/api/resume/ai-verdict")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("AI verdict generated successfully.");
    expect(res.body.data.verdict).toBe(aiVerdictFixture.verdict);
  });

  it("rejects an out-of-enum verdict from the model", async () => {
    setAIResponse({ ...aiVerdictFixture, verdict: "Definitely Hired" });

    const res = await request(app)
      .post("/api/resume/ai-verdict")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expect(res.status).toBe(500);
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/resume/ai-verdict").send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });
});

describe("POST /api/resume/interview-probability", () => {
  it("returns the probability for a valid request", async () => {
    setAIResponse(interviewProbabilityFixture);

    const res = await request(app)
      .post("/api/resume/interview-probability")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Interview probability calculated successfully.");
    expect(res.body.data.probability).toBe(interviewProbabilityFixture.probability);
    expect(res.body.data.confidence).toBe("Medium");
  });

  it("rejects a missing jobDescription", async () => {
    expectFailure(
      await request(app)
        .post("/api/resume/interview-probability")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/resume/interview-probability").send({ resume: RESUME_TEXT, jobDescription: JOB_DESCRIPTION_TEXT })
    );
  });
});

it("supports the local mock AI provider fallback", async () => {
  const previousProvider = process.env.AI_PROVIDER;

  try {
    vi.resetModules();
    process.env.AI_PROVIDER = "mock";

    const { aiProvider } = await import("../src/ai/providers/index.js");
    const response = await aiProvider.generate({
      userPrompt: "Analyze this resume and return JSON for a resume assessment.",
    });

    expect(response.model).toBe("mock");
    expect(() => JSON.parse(response.content)).not.toThrow();
    expect(JSON.parse(response.content)).toHaveProperty("summary");
  } finally {
    process.env.AI_PROVIDER = previousProvider;
    vi.resetModules();
  }
});
