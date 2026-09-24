/**
 * Global job-catalogue authorization.
 *
 * When WORKER_SECRET / ADMIN_EMAILS are configured, arbitrary authenticated
 * users must NOT be able to mutate the global catalogue or run aggregation.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";
import { validJob } from "./fixtures/requests.js";

const WORKER_SECRET = "test-only-worker-secret";

let user: TestUser;
let prevWorkerSecret: string | undefined;
let prevAdminEmails: string | undefined;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser(app);
  prevWorkerSecret = process.env.WORKER_SECRET;
  prevAdminEmails = process.env.ADMIN_EMAILS;
  process.env.WORKER_SECRET = WORKER_SECRET;
  delete process.env.ADMIN_EMAILS;
});

afterAll(async () => {
  if (prevWorkerSecret === undefined) delete process.env.WORKER_SECRET;
  else process.env.WORKER_SECRET = prevWorkerSecret;
  if (prevAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = prevAdminEmails;
  await disconnectDatabase();
});

describe("job catalogue authorization", () => {
  it("rejects POST /jobs for a normal authenticated user without worker secret", async () => {
    const res = await request(app)
      .post("/jobs")
      .set(bearer(user.token))
      .send(validJob());

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("allows POST /jobs with a valid worker secret", async () => {
    const res = await request(app)
      .post("/jobs")
      .set(bearer(user.token))
      .set("x-worker-secret", WORKER_SECRET)
      .send(validJob());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("rejects POST /api/jobs/aggregate for a normal authenticated user", async () => {
    const res = await request(app)
      .post("/api/jobs/aggregate")
      .set(bearer(user.token))
      .send({ jobs: [validJob()] });

    expect(res.status).toBe(403);
  });

  it("allows POST /api/jobs/aggregate with a valid worker secret", async () => {
    const res = await request(app)
      .post("/api/jobs/aggregate")
      .set(bearer(user.token))
      .set("x-worker-secret", WORKER_SECRET)
      .send({ jobs: [validJob()] });

    expect(res.status).toBe(200);
  });

  it("allows an admin email without the worker secret", async () => {
    process.env.ADMIN_EMAILS = user.email;
    const res = await request(app)
      .post("/jobs")
      .set(bearer(user.token))
      .send(validJob());

    expect(res.status).toBe(201);
  });

  it("still allows user-owned reads (GET /jobs) for normal users", async () => {
    const res = await request(app).get("/jobs").set(bearer(user.token));
    expect(res.status).toBe(200);
  });
});
