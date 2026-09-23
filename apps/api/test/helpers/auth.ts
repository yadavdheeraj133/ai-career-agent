/**
 * Authentication helpers.
 *
 * Users are created by driving the real /auth/register and /auth/login
 * endpoints rather than by inserting rows directly, so the fixtures exercise
 * the same bcrypt hashing and JWT signing path production traffic uses.
 */
import request from "supertest";
import type { Express } from "express";

/** Satisfies both the 8-char minimum and the 32-char maximum. */
export const TEST_PASSWORD = "TestPass123";

let sequence = 0;

export function uniqueEmail(prefix = "user"): string {
  sequence += 1;
  return `${prefix}.${Date.now()}.${sequence}@example.test`;
}

export interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
  token: string;
}

export interface CreateUserOverrides {
  name?: string;
  email?: string;
  password?: string;
}

export async function createUser(
  app: Express,
  overrides: CreateUserOverrides = {}
): Promise<TestUser> {
  const name = overrides.name ?? "Test User";
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? TEST_PASSWORD;

  const registered = await request(app)
    .post("/auth/register")
    .send({ name, email, password });

  if (registered.status !== 201) {
    throw new Error(
      `createUser(): register failed with ${registered.status} — ${JSON.stringify(registered.body)}`
    );
  }

  const loggedIn = await request(app)
    .post("/auth/login")
    .send({ email, password });

  if (loggedIn.status !== 200) {
    throw new Error(
      `createUser(): login failed with ${loggedIn.status} — ${JSON.stringify(loggedIn.body)}`
    );
  }

  return {
    id: registered.body.data.id,
    name,
    email,
    password,
    token: loggedIn.body.data.token,
  };
}

/** Convenience for `.set(...headers)` — pairs with `authMiddleware`. */
export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
