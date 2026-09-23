/**
 * Endpoints 4-6 — /users/profile (GET, PATCH, DELETE)
 * routes/user.route.ts
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized, expectValidationFailure } from "./helpers/http.js";
import { validResume } from "./fixtures/requests.js";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("GET /users/profile", () => {
  it("returns the profile for the authenticated user", async () => {
    const user = await createUser(app);

    const res = await request(app).get("/users/profile").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data).toMatchObject({ id: user.id, name: user.name, email: user.email });
  });

  it("never exposes the password hash", async () => {
    const user = await createUser(app);

    const res = await request(app).get("/users/profile").set(bearer(user.token));

    expect(res.body.data.password).toBeUndefined();
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/users/profile"));
  });

  it("rejects an invalid token", async () => {
    expectUnauthorized(
      await request(app).get("/users/profile").set(bearer("garbage.token.value"))
    );
  });
});

describe("PATCH /users/profile", () => {
  it("updates the name and persists it", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .patch("/users/profile")
      .set(bearer(user.token))
      .send({ name: "Updated Name" });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Profile updated successfully");
    expect(res.body.data.name).toBe("Updated Name");

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stored!.name).toBe("Updated Name");
  });

  it("leaves unrelated fields untouched", async () => {
    const user = await createUser(app);

    await request(app)
      .patch("/users/profile")
      .set(bearer(user.token))
      .send({ name: "Renamed" });

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stored!.email).toBe(user.email);
  });

  it("rejects a name shorter than 2 characters", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .patch("/users/profile")
      .set(bearer(user.token))
      .send({ name: "a" });

    expectValidationFailure(res);
  });

  it("rejects a non-string name", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .patch("/users/profile")
      .set(bearer(user.token))
      .send({ name: 42 });

    expectValidationFailure(res);
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).patch("/users/profile").send({ name: "Nope" })
    );
  });

  it("does not modify the user when unauthenticated", async () => {
    const user = await createUser(app);

    await request(app).patch("/users/profile").send({ name: "Hacker" });

    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stored!.name).toBe(user.name);
  });
});

describe("DELETE /users/profile", () => {
  it("deletes the account and returns 200", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .delete("/users/profile")
      .set(bearer(user.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Account deleted successfully");

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
  });

  it("cascades to the user's resume", async () => {
    const user = await createUser(app);

    await request(app)
      .post("/resume")
      .set(bearer(user.token))
      .send(validResume())
      .expect(201);

    await request(app).delete("/users/profile").set(bearer(user.token)).expect(200);

    expect(await prisma.resume.count()).toBe(0);
  });

  it("cascades to the user's preferences and settings", async () => {
    const user = await createUser(app);

    await request(app).post("/api/preferences").set(bearer(user.token)).send({ jobRole: "Engineer" }).expect(201);
    await request(app).post("/users/settings").set(bearer(user.token)).send({}).expect(201);

    await request(app).delete("/users/profile").set(bearer(user.token)).expect(200);

    expect(await prisma.userPreferences.count()).toBe(0);
    expect(await prisma.userSettings.count()).toBe(0);
  });

  it("invalidates the token afterwards", async () => {
    const user = await createUser(app);

    await request(app).delete("/users/profile").set(bearer(user.token)).expect(200);

    expectUnauthorized(
      await request(app).get("/users/profile").set(bearer(user.token))
    );
  });

  it("returns 401 when the account is already gone", async () => {
    const user = await createUser(app);

    await request(app).delete("/users/profile").set(bearer(user.token)).expect(200);

    const res = await request(app).delete("/users/profile").set(bearer(user.token));

    expectFailure(res, 401);
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).delete("/users/profile"));
  });
});
