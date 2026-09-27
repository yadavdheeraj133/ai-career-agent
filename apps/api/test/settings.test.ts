/**
 * Endpoints 42-44 — /users/settings (GET, POST, PATCH)
 * routes/user-settings.route.ts
 *
 * The writable surface is `updateUserSettingsSchema`
 * (src/validators/user-settings.validator.ts): Appearance (`theme`), AI
 * (`minMatchScore`, `autoMatch`) and Notifications. The tests below pin the
 * defaults, round-tripping and the validation that keeps an unusable value out
 * of the database.
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

  it("defaults Appearance and AI to the values the Settings page shows", async () => {
    const res = await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({});

    expectSuccess(res, 201);
    expect(res.body.data).toMatchObject({
      theme: "light",
      minMatchScore: 70,
      autoMatch: true,
      interviewReminders: true,
    });
  });

  it("persists Appearance, AI and Notifications values on create", async () => {
    const res = await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({
        theme: "dark",
        minMatchScore: 45,
        autoMatch: false,
        interviewReminders: false,
      });

    expectSuccess(res, 201);
    expect(res.body.data).toMatchObject({
      theme: "dark",
      minMatchScore: 45,
      autoMatch: false,
      interviewReminders: false,
    });

    const stored = await prisma.userSettings.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(stored.theme).toBe("dark");
    expect(stored.minMatchScore).toBe(45);
    expect(stored.autoMatch).toBe(false);
    expect(stored.interviewReminders).toBe(false);
  });

  it("rejects an unknown theme instead of storing a value nothing honours", async () => {
    const res = await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({ theme: "neon" });

    expectFailure(res, 400);
    expect(await prisma.userSettings.count()).toBe(0);
  });

  it("rejects a minMatchScore outside 0-100", async () => {
    for (const minMatchScore of [-1, 101, 12.5]) {
      const res = await request(app)
        .post("/users/settings")
        .set(bearer(user.token))
        .send({ minMatchScore });

      expectFailure(res, 400);
    }

    expect(await prisma.userSettings.count()).toBe(0);
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

  it("round-trips Appearance, AI and Notifications values through PATCH", async () => {
    await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({})
      .expect(201);

    const res = await request(app)
      .patch("/users/settings")
      .set(bearer(user.token))
      .send({ theme: "system", minMatchScore: 90, autoMatch: false });

    expectSuccess(res, 200);
    expect(res.body.data).toMatchObject({
      theme: "system",
      minMatchScore: 90,
      autoMatch: false,
      // Untouched columns keep the value they were created with.
      jobAlerts: true,
      applicationUpdates: true,
      interviewReminders: true,
    });

    const reread = await request(app)
      .get("/users/settings")
      .set(bearer(user.token));

    expectSuccess(reread, 200);
    expect(reread.body.data).toMatchObject({
      theme: "system",
      minMatchScore: 90,
      autoMatch: false,
    });
  });

  it("round-trips the notification toggles through PATCH", async () => {
    await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({})
      .expect(201);

    const res = await request(app)
      .patch("/users/settings")
      .set(bearer(user.token))
      .send({
        emailNotifications: false,
        jobAlerts: false,
        applicationUpdates: false,
        interviewReminders: false,
      });

    expectSuccess(res, 200);
    expect(res.body.data).toMatchObject({
      emailNotifications: false,
      jobAlerts: false,
      applicationUpdates: false,
      interviewReminders: false,
      // Appearance and AI are not part of this section's payload.
      theme: "light",
      minMatchScore: 70,
      autoMatch: true,
    });
  });

  it("ignores unknown keys so a round-tripped settings object is accepted", async () => {
    await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({})
      .expect(201);

    const stored = await prisma.userSettings.findUniqueOrThrow({
      where: { userId: user.id },
    });

    const res = await request(app)
      .patch("/users/settings")
      .set(bearer(user.token))
      .send({ ...stored, jobAlerts: false });

    expectSuccess(res, 200);
    expect(res.body.data.jobAlerts).toBe(false);
  });

  it("rejects an invalid value on PATCH without changing the row", async () => {
    await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({ theme: "dark" })
      .expect(201);

    const res = await request(app)
      .patch("/users/settings")
      .set(bearer(user.token))
      .send({ theme: "solarized" });

    expectFailure(res, 400);

    const stored = await prisma.userSettings.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(stored.theme).toBe("dark");
  });

  it("still rejects an empty PATCH", async () => {
    await request(app)
      .post("/users/settings")
      .set(bearer(user.token))
      .send({})
      .expect(201);

    const res = await request(app)
      .patch("/users/settings")
      .set(bearer(user.token))
      .send({});

    expectFailure(res, 400);
    expect(res.body.message).toBe("At least one field must be provided for update.");
  });
});
