/**
 * Endpoints 1-3 — /auth/register, /auth/login, /auth/me
 * routes/auth.routes.ts
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser, TEST_PASSWORD, uniqueEmail } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized, expectValidationFailure } from "./helpers/http.js";

const validRegistration = () => ({
  name: "Test User",
  email: uniqueEmail(),
  password: TEST_PASSWORD,
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("POST /auth/register", () => {
  it("creates a user and returns 201", async () => {
    const payload = validRegistration();

    const res = await request(app).post("/auth/register").send(payload);

    expectSuccess(res, 201);
    expect(res.body.message).toBe("User registered successfully");
    expect(res.body.data).toMatchObject({
      name: payload.name,
      email: payload.email,
    });
    expect(res.body.data.id).toBeTypeOf("string");
  });

  it("persists the user with a bcrypt hash rather than the plaintext password", async () => {
    const payload = validRegistration();

    await request(app).post("/auth/register").send(payload).expect(201);

    const stored = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    expect(stored).not.toBeNull();
    expect(stored!.password).not.toBe(payload.password);
    // bcrypt hashes are prefixed with the cost factor, e.g. $2b$10$...
    expect(stored!.password.startsWith("$2")).toBe(true);
  });

  it("normalises the email to lowercase", async () => {
    const email = `Mixed.Case.${Date.now()}@Example.Test`;

    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Test User", email, password: TEST_PASSWORD });

    expectSuccess(res, 201);
    expect(res.body.data.email).toBe(email.toLowerCase());
  });

  it("rejects a duplicate email with 409", async () => {
    const payload = validRegistration();

    await request(app).post("/auth/register").send(payload).expect(201);

    const res = await request(app).post("/auth/register").send(payload);

    expectFailure(res, 409);
    expect(res.body.message).toBe("Email already exists");
  });

  it("treats a differently-cased duplicate email as a conflict", async () => {
    const payload = validRegistration();

    await request(app).post("/auth/register").send(payload).expect(201);

    const res = await request(app)
      .post("/auth/register")
      .send({ ...payload, email: payload.email.toUpperCase() });

    expectFailure(res, 409);
  });

  it("rejects an empty body", async () => {
    const res = await request(app).post("/auth/register").send({});

    expectValidationFailure(res);
  });

  it("rejects a missing name", async () => {
    const { email, password } = validRegistration();

    const res = await request(app).post("/auth/register").send({ email, password });

    expectValidationFailure(res);
  });

  it("rejects a missing email", async () => {
    const { name, password } = validRegistration();

    const res = await request(app).post("/auth/register").send({ name, password });

    expectValidationFailure(res);
  });

  it("rejects a missing password", async () => {
    const { name, email } = validRegistration();

    const res = await request(app).post("/auth/register").send({ name, email });

    expectValidationFailure(res);
  });

  it("rejects a malformed email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...validRegistration(), email: "not-an-email" });

    expectValidationFailure(res);
  });

  it("rejects a name shorter than 3 characters", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...validRegistration(), name: "ab" });

    expectValidationFailure(res);
  });

  it("rejects a name longer than 50 characters", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...validRegistration(), name: "a".repeat(51) });

    expectValidationFailure(res);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...validRegistration(), password: "short1" });

    expectValidationFailure(res);
  });

  it("rejects a password longer than 32 characters", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...validRegistration(), password: "a".repeat(33) });

    expectValidationFailure(res);
  });

  it("rejects non-string field types", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: 123, email: 456, password: 789 });

    expectValidationFailure(res);
  });

  it("does not create a user when validation fails", async () => {
    await request(app).post("/auth/register").send({ email: "x@y.test" });

    expect(await prisma.user.count()).toBe(0);
  });
});

describe("POST /auth/login", () => {
  it("returns a token and the user on valid credentials", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: user.password });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Login successful");
    expect(res.body.data.token).toBeTypeOf("string");
    expect(res.body.data.user).toMatchObject({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  });

  it("does not include the password in the response", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: user.password });

    expect(res.body.data.user.password).toBeUndefined();
  });

  it("rejects a wrong password with 401", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "WrongPass123" });

    expectFailure(res, 401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("rejects an unknown email with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: uniqueEmail("ghost"), password: TEST_PASSWORD });

    expectFailure(res, 401);
  });

  it("logs in with a differently-cased email", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email.toUpperCase(), password: user.password });

    expectSuccess(res, 200);
  });

  it("rejects an empty body", async () => {
    const res = await request(app).post("/auth/login").send({});

    expectValidationFailure(res);
  });

  it("rejects a malformed email", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nope", password: TEST_PASSWORD });

    expectValidationFailure(res);
  });

  it("rejects a password below the minimum length", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: uniqueEmail(), password: "short" });

    expectValidationFailure(res);
  });
});

describe("GET /auth/me", () => {
  it("returns the current user for a valid token", async () => {
    const user = await createUser(app);

    const res = await request(app).get("/auth/me").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  });

  it("rejects a request with no Authorization header", async () => {
    const res = await request(app).get("/auth/me");

    expectUnauthorized(res);
    expect(res.body.message).toBe("Authorization token is required");
  });

  it("rejects a non-Bearer Authorization header", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set({ Authorization: "Basic abc123" });

    expectUnauthorized(res);
    expect(res.body.message).toBe("Invalid authorization format");
  });

  it("rejects a Bearer header with no token", async () => {
    const res = await request(app).get("/auth/me").set({ Authorization: "Bearer " });

    expectUnauthorized(res);
  });

  it("rejects a malformed JWT", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set(bearer("not.a.jwt"));

    expectUnauthorized(res);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("rejects a token signed with the wrong secret", async () => {
    // Header/payload are well-formed; only the signature is wrong.
    const forged =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJ1c2VySWQiOiJmYWtlIiwiaWF0IjoxNzAwMDAwMDAwfQ." +
      "ZmFrZXNpZ25hdHVyZQ";

    const res = await request(app).get("/auth/me").set(bearer(forged));

    expectUnauthorized(res);
  });

  it("rejects a valid token whose user no longer exists", async () => {
    const user = await createUser(app);

    await prisma.user.delete({ where: { id: user.id } });

    const res = await request(app).get("/auth/me").set(bearer(user.token));

    expectUnauthorized(res);
    expect(res.body.message).toBe("User not found");
  });
});

describe("error envelope", () => {
  it("returns a JSON 404 for an unknown route", async () => {
    const res = await request(app).get("/definitely-not-a-route");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });
});
