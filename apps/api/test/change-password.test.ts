/**
 * Authenticated password change: POST /auth/change-password
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser, TEST_PASSWORD, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, resetDatabase } from "./helpers/db.js";

let user: TestUser;

beforeEach(async () => {
  await resetDatabase();
  user = await createUser(app);
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("POST /auth/change-password", () => {
  it("changes the password with the correct current password", async () => {
    const res = await request(app)
      .post("/auth/change-password")
      .set(bearer(user.token))
      .send({ currentPassword: TEST_PASSWORD, newPassword: "NewPass456" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Old password no longer works; new password does.
    const oldLogin = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "NewPass456" });
    expect(newLogin.status).toBe(200);
  });

  it("rejects an incorrect current password with 401", async () => {
    const res = await request(app)
      .post("/auth/change-password")
      .set(bearer(user.token))
      .send({ currentPassword: "WrongPass999", newPassword: "NewPass456" });

    expect(res.status).toBe(401);
  });

  it("rejects a too-short new password with 400", async () => {
    const res = await request(app)
      .post("/auth/change-password")
      .set(bearer(user.token))
      .send({ currentPassword: TEST_PASSWORD, newPassword: "short" });

    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .post("/auth/change-password")
      .send({ currentPassword: TEST_PASSWORD, newPassword: "NewPass456" });

    expect(res.status).toBe(401);
  });
});
