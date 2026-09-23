/**
 * Endpoints 39-41 — /api/preferences (GET, POST, PATCH)
 * routes/user-preference.routes.ts
 *
 * Note: this controller performs no request validation — it forwards the raw
 * `req.body` fields straight into Prisma. The tests below pin that down.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized } from "./helpers/http.js";

let user: TestUser;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser(app);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("GET /api/preferences", () => {
  it("returns the preferences when they exist", async () => {
    await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .send({ jobRole: "Backend Engineer", location: "Remote" })
      .expect(201);

    const res = await request(app).get("/api/preferences").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data).toMatchObject({
      jobRole: "Backend Engineer",
      location: "Remote",
      userId: user.id,
    });
  });

  it("returns 404 when no preferences exist", async () => {
    const res = await request(app).get("/api/preferences").set(bearer(user.token));

    expectFailure(res, 404);
    expect(res.body.message).toBe("User preferences not found");
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/api/preferences"));
  });
});

describe("POST /api/preferences", () => {
  it("creates preferences and returns 201", async () => {
    const res = await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .send({
        jobRole: "Backend Engineer",
        location: "Berlin",
        workMode: "Hybrid",
        jobType: "Full-time",
        salary: "$120k",
      });

    expectSuccess(res, 201);
    expect(res.body.message).toBe("User preferences created successfully.");
    expect(res.body.data).toMatchObject({
      jobRole: "Backend Engineer",
      location: "Berlin",
      workMode: "Hybrid",
      jobType: "Full-time",
      salary: "$120k",
      userId: user.id,
    });
  });

  it("persists the preferences", async () => {
    await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .send({ jobRole: "Backend Engineer" })
      .expect(201);

    const stored = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
    });

    expect(stored).not.toBeNull();
    expect(stored!.jobRole).toBe("Backend Engineer");
  });

  it("accepts an empty body, since every field is optional", async () => {
    const res = await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .send({});

    expectSuccess(res, 201);
    expect(res.body.data.jobRole).toBeNull();
  });

  it("returns 409 when preferences already exist", async () => {
    await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .send({ jobRole: "Backend Engineer" })
      .expect(201);

    const res = await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .send({ jobRole: "Data Scientist" });

    expectFailure(res, 409);
    expect(res.body.message).toBe("User preferences already exist");
  });

  it("scopes preferences per user", async () => {
    const other = await createUser(app);

    await request(app).post("/api/preferences").set(bearer(user.token)).send({ jobRole: "A" }).expect(201);

    const res = await request(app)
      .post("/api/preferences")
      .set(bearer(other.token))
      .send({ jobRole: "B" });

    expectSuccess(res, 201);
    expect(await prisma.userPreferences.count()).toBe(2);
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/preferences").send({ jobRole: "Backend Engineer" })
    );
  });

  it("does not create preferences when unauthenticated", async () => {
    await request(app).post("/api/preferences").send({ jobRole: "Backend Engineer" });

    expect(await prisma.userPreferences.count()).toBe(0);
  });
});

describe("PATCH /api/preferences", () => {
  it("updates existing preferences and returns 200", async () => {
    await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .send({ jobRole: "Backend Engineer", location: "Berlin" })
      .expect(201);

    const res = await request(app)
      .patch("/api/preferences")
      .set(bearer(user.token))
      .send({ location: "Remote", salary: "$150k" });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("User preferences updated successfully.");
    expect(res.body.data.location).toBe("Remote");
    expect(res.body.data.salary).toBe("$150k");
  });

  it("persists the update", async () => {
    await request(app)
      .post("/api/preferences")
      .set(bearer(user.token))
      .send({ jobRole: "Backend Engineer" })
      .expect(201);

    await request(app)
      .patch("/api/preferences")
      .set(bearer(user.token))
      .send({ jobRole: "Staff Engineer" })
      .expect(200);

    const stored = await prisma.userPreferences.findUnique({ where: { userId: user.id } });
    expect(stored!.jobRole).toBe("Staff Engineer");
  });

  it("returns 404 when no preferences exist", async () => {
    const res = await request(app)
      .patch("/api/preferences")
      .set(bearer(user.token))
      .send({ jobRole: "Backend Engineer" });

    expectFailure(res, 404);
    expect(res.body.message).toBe("User preferences not found");
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).patch("/api/preferences").send({ jobRole: "Backend Engineer" })
    );
  });
});
