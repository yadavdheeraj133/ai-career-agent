/**
 * Endpoints 11-15 — /jobs (POST, GET, GET :id, PATCH :id, DELETE :id)
 * routes/jobs.route.ts
 *
 * Jobs are a global (non user-scoped) catalogue, so every test starts from an
 * empty `job` table.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized, expectValidationFailure } from "./helpers/http.js";
import { validJob } from "./fixtures/requests.js";

let user: TestUser;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser(app);
});

afterAll(async () => {
  await disconnectDatabase();
});

async function createJob(overrides: Record<string, unknown> = {}) {
  const payload = validJob(overrides);
  const res = await request(app)
    .post("/jobs")
    .set(bearer(user.token))
    .send(payload);

  return { payload, res, id: res.body?.data?.id as string };
}

describe("POST /jobs", () => {
  it("creates a job and returns 201", async () => {
    const { payload, res } = await createJob();

    expectSuccess(res, 201);
    expect(res.body.message).toBe("Job created successfully");
    expect(res.body.data).toMatchObject({
      title: payload.title,
      company: payload.company,
      url: payload.url,
    });
  });

  it("persists the job", async () => {
    const { payload } = await createJob();

    const stored = await prisma.job.findUnique({ where: { url: payload.url } });
    expect(stored).not.toBeNull();
    expect(stored!.workMode).toBe("Remote");
  });

  it("rejects a duplicate URL with 409", async () => {
    const { payload } = await createJob();

    const res = await request(app)
      .post("/jobs")
      .set(bearer(user.token))
      .send(validJob({ url: payload.url }));

    expectFailure(res, 409);
    expect(res.body.message).toBe("Job already exists");
  });

  it("rejects a missing title", async () => {
    const { title, ...rest } = validJob();

    expectValidationFailure(
      await request(app).post("/jobs").set(bearer(user.token)).send(rest)
    );
  });

  it("rejects a title shorter than 3 characters", async () => {
    expectValidationFailure(
      await request(app).post("/jobs").set(bearer(user.token)).send(validJob({ title: "ab" }))
    );
  });

  it("rejects an invalid workMode", async () => {
    const res = await request(app)
      .post("/jobs")
      .set(bearer(user.token))
      .send(validJob({ workMode: "Teleport" }));

    expectValidationFailure(res);
  });

  it("rejects an invalid jobType", async () => {
    expectValidationFailure(
      await request(app).post("/jobs").set(bearer(user.token)).send(validJob({ jobType: "Freelance-ish" }))
    );
  });

  it("rejects a malformed url", async () => {
    expectValidationFailure(
      await request(app).post("/jobs").set(bearer(user.token)).send(validJob({ url: "not a url" }))
    );
  });

  it("rejects a description over 10000 characters", async () => {
    expectValidationFailure(
      await request(app).post("/jobs").set(bearer(user.token)).send(validJob({ description: "a".repeat(10_001) }))
    );
  });

  it("rejects an empty body", async () => {
    expectValidationFailure(await request(app).post("/jobs").set(bearer(user.token)).send({}));
  });

  it("accepts a job without the optional fields", async () => {
    const { experience, salary, description, ...required } = validJob();

    const res = await request(app).post("/jobs").set(bearer(user.token)).send(required);

    expectSuccess(res, 201);
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).post("/jobs").send(validJob()));
  });

  it("does not create a job when unauthenticated", async () => {
    await request(app).post("/jobs").send(validJob());

    expect(await prisma.job.count()).toBe(0);
  });
});

describe("GET /jobs", () => {
  it("returns an empty list with count 0", async () => {
    const res = await request(app).get("/jobs").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.count).toBe(0);
    expect(res.body.data).toEqual([]);
  });

  it("returns all jobs with a matching count", async () => {
    await createJob();
    await createJob();

    const res = await request(app).get("/jobs").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.count).toBe(2);
    expect(res.body.data).toHaveLength(2);
  });

  it("orders results by createdAt descending", async () => {
    const first = await createJob({ title: "First Job" });
    const second = await createJob({ title: "Second Job" });

    const res = await request(app).get("/jobs").set(bearer(user.token));

    const ids = res.body.data.map((job: { id: string }) => job.id);
    expect(ids[0]).toBe(second.id);
    expect(ids[1]).toBe(first.id);
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/jobs"));
  });
});

describe("GET /jobs/:id", () => {
  it("returns the requested job", async () => {
    const { id, payload } = await createJob();

    const res = await request(app).get(`/jobs/${id}`).set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.url).toBe(payload.url);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .get("/jobs/cuid-does-not-exist")
      .set(bearer(user.token));

    expectFailure(res, 404);
    expect(res.body.message).toBe("Job not found");
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/jobs/anything"));
  });
});

describe("PATCH /jobs/:id", () => {
  it("updates the job and returns 200", async () => {
    const { id } = await createJob();

    const res = await request(app)
      .patch(`/jobs/${id}`)
      .set(bearer(user.token))
      .send({ title: "Updated Title" });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Job updated successfully");
    expect(res.body.data.title).toBe("Updated Title");
  });

  it("persists the update", async () => {
    const { id } = await createJob();

    await request(app).patch(`/jobs/${id}`).set(bearer(user.token)).send({ salary: "$200k" }).expect(200);

    const stored = await prisma.job.findUnique({ where: { id } });
    expect(stored!.salary).toBe("$200k");
  });

  it("accepts a partial update", async () => {
    const { id, payload } = await createJob();

    const res = await request(app)
      .patch(`/jobs/${id}`)
      .set(bearer(user.token))
      .send({ location: "Berlin" });

    expectSuccess(res, 200);
    expect(res.body.data.location).toBe("Berlin");
    expect(res.body.data.title).toBe(payload.title);
  });

  it("rejects an invalid field value", async () => {
    const { id } = await createJob();

    expectValidationFailure(
      await request(app).patch(`/jobs/${id}`).set(bearer(user.token)).send({ workMode: "Teleport" })
    );
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .patch("/jobs/cuid-does-not-exist")
      .set(bearer(user.token))
      .send({ title: "Updated Title" });

    expectFailure(res, 404);
  });

  it("requires authentication", async () => {
    const { id } = await createJob();

    expectUnauthorized(
      await request(app).patch(`/jobs/${id}`).send({ title: "Nope" })
    );
  });
});

describe("DELETE /jobs/:id", () => {
  it("deletes the job and returns 200", async () => {
    const { id } = await createJob();

    const res = await request(app).delete(`/jobs/${id}`).set(bearer(user.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Job deleted successfully");
    expect(await prisma.job.count()).toBe(0);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app)
      .delete("/jobs/cuid-does-not-exist")
      .set(bearer(user.token));

    expectFailure(res, 404);
  });

  it("returns 404 when deleting the same job twice", async () => {
    const { id } = await createJob();

    await request(app).delete(`/jobs/${id}`).set(bearer(user.token)).expect(200);

    expectFailure(
      await request(app).delete(`/jobs/${id}`).set(bearer(user.token)),
      404
    );
  });

  it("requires authentication", async () => {
    const { id } = await createJob();

    expectUnauthorized(await request(app).delete(`/jobs/${id}`));
    expect(await prisma.job.count()).toBe(1);
  });
});
