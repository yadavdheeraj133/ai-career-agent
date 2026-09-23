/**
 * Endpoints 42-44 — /users/settings (GET, POST, PATCH)
 * routes/user-settings.route.ts
 *
 * Note: like /api/preferences, this controller does no request validation.
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

describe("GET /users/settings", () => {
  it("returns the settings when they exist", async () => {
    await request(app).post("/users/settings").set(bearer(user.token)).send({}).expect(201);

    const res = await request(app).get("/users/settings").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data).toMatchObject({
      userId: user.id,
      emailNotifications: true,
      jobAlerts: true,
      applicationUpdates: true,
    });
  });

  it("returns 404 when no settings exist", async () => {
    const res = await request(app).get("/users/settings").set(bearer(user.token));

    expectFailure(res, 404);
    expect(res.body.message).toBe("User settings not found");
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/users/settings"));
  });
});

describe("POST /users/settings", () => {
  it("creates settings with defaults and returns 201", async () => {
    const res = await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({});

    expectSuccess(res, 201);
    expect(res.body.message).toBe("User settings created successfully.");
    expect(res.body.data).toMatchObject({
      emailNotifications: true,
      jobAlerts: true,
      applicationUpdates: true,
      userId: user.id,
    });
  });

  it("honours explicit values", async () => {
    const res = await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({ emailNotifications: false, jobAlerts: false, applicationUpdates: true });

    expectSuccess(res, 201);
    expect(res.body.data.emailNotifications).toBe(false);
    expect(res.body.data.jobAlerts).toBe(false);
  });

  it("persists the settings", async () => {
    await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({ jobAlerts: false })
      .expect(201);

    const stored = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    expect(stored).not.toBeNull();
    expect(stored!.jobAlerts).toBe(false);
  });

  it("returns 409 when settings already exist", async () => {
    await request(app).post("/users/settings").set(bearer(user.token)).send({}).expect(201);

    const res = await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({ jobAlerts: false });

    expectFailure(res, 409);
    expect(res.body.message).toBe("User settings already exist");
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).post("/users/settings").send({}));
  });

  it("does not create settings when unauthenticated", async () => {
    await request(app).post("/users/settings").send({});

    expect(await prisma.userSettings.count()).toBe(0);
  });
});

describe("PATCH /users/settings", () => {
  it("updates existing settings and returns 200", async () => {
    await request(app).post("/users/settings").set(bearer(user.token)).send({}).expect(201);

    const res = await request(app)
      .patch("/users/settings")
      .set(bearer(user.token))
      .send({ emailNotifications: false });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("User settings updated successfully.");
    expect(res.body.data.emailNotifications).toBe(false);
    expect(res.body.data.jobAlerts).toBe(true);
  });

  it("persists the update", async () => {
    await request(app).post("/users/settings").set(bearer(user.token)).send({}).expect(201);

    await request(app)
      .patch("/users/settings")
      .set(bearer(user.token))
      .send({ applicationUpdates: false })
      .expect(200);

    const stored = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    expect(stored!.applicationUpdates).toBe(false);
  });

  it("returns 404 when no settings exist", async () => {
    const res = await request(app)
      .patch("/users/settings")
      .set(bearer(user.token))
      .send({ jobAlerts: false });

    expectFailure(res, 404);
    expect(res.body.message).toBe("User settings not found");
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).patch("/users/settings").send({ jobAlerts: false })
    );
  });
});
