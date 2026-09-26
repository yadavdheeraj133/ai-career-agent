/**
 * Endpoints 29-31 — /api/career/*
 * routes/ai.career.routes.ts
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { installAiMock, resetAiMock, setAIFailure, setAIResponse } from "./helpers/ai.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized } from "./helpers/http.js";
import { careerCoachFixture, careerRoadmapFixture, learningPathFixture } from "./fixtures/ai.js";
import { RESUME_TEXT } from "./fixtures/requests.js";

const CAREER_GOAL = "Senior Backend Engineer";

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

describe("POST /api/career/coach", () => {
  it("returns coaching for a valid request", async () => {
    setAIResponse(careerCoachFixture);

    const res = await request(app)
      .post("/api/career/coach")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, careerGoal: CAREER_GOAL });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Career coaching generated successfully.");
    expect(res.body.data.careerGoal).toBe(careerCoachFixture.careerGoal);
  });

  it("rejects a missing resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/career/coach")
        .set(bearer(user.token))
        .send({ careerGoal: CAREER_GOAL }),
      400
    );
  });

  it("rejects a missing careerGoal", async () => {
    expectFailure(
      await request(app)
        .post("/api/career/coach")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT }),
      400
    );
  });

  it("rejects an empty body", async () => {
    expectFailure(
      await request(app).post("/api/career/coach").set(bearer(user.token)).send({}),
      400
    );
  });

  it("rejects a blank careerGoal", async () => {
    expectFailure(
      await request(app)
        .post("/api/career/coach")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT, careerGoal: "   " }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/career/coach").send({ resume: RESUME_TEXT, careerGoal: CAREER_GOAL })
    );
  });

  it("returns 503 when the model fails", async () => {
    setAIFailure();

    const res = await request(app)
      .post("/api/career/coach")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, careerGoal: CAREER_GOAL });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("AI_UPSTREAM_UNAVAILABLE");
  });
});

describe("POST /api/career/roadmap", () => {
  it("returns a roadmap for a valid request", async () => {
    setAIResponse(careerRoadmapFixture);

    const res = await request(app)
      .post("/api/career/roadmap")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, careerGoal: CAREER_GOAL });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Career roadmap generated successfully.");
    expect(res.body.data.targetRole).toBe(careerRoadmapFixture.targetRole);
    expect(res.body.data.roadmap).toHaveLength(1);
  });

  it("accepts the optional currentRole field", async () => {
    setAIResponse(careerRoadmapFixture);

    const res = await request(app)
      .post("/api/career/roadmap")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, currentRole: "Backend Engineer", careerGoal: CAREER_GOAL });

    expectSuccess(res, 200);
  });

  it("rejects a missing careerGoal", async () => {
    expectFailure(
      await request(app)
        .post("/api/career/roadmap")
        .set(bearer(user.token))
        .send({ resume: RESUME_TEXT }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/career/roadmap").send({ resume: RESUME_TEXT, careerGoal: CAREER_GOAL })
    );
  });
});

describe("POST /api/career/learning-path", () => {
  it("returns a learning path for a valid request", async () => {
    setAIResponse(learningPathFixture);

    const res = await request(app)
      .post("/api/career/learning-path")
      .set(bearer(user.token))
      .send({ resume: RESUME_TEXT, careerGoal: CAREER_GOAL });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Learning path generated successfully.");
    expect(res.body.data.estimatedDuration).toBe(learningPathFixture.estimatedDuration);
  });

  it("rejects a missing resume", async () => {
    expectFailure(
      await request(app)
        .post("/api/career/learning-path")
        .set(bearer(user.token))
        .send({ careerGoal: CAREER_GOAL }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/career/learning-path").send({ resume: RESUME_TEXT, careerGoal: CAREER_GOAL })
    );
  });
});
