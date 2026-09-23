/**
 * Response-shape helpers.
 *
 * Every endpoint in this API answers with the same envelope
 * (`{ success, message?, data }`, plus `count` on list endpoints), so the
 * assertions are centralised here instead of being re-typed 44 times.
 */
import { expect } from "vitest";
import type { Response } from "supertest";

export function expectSuccess(res: Response, status = 200): void {
  expect(res.status).toBe(status);
  expect(res.body).toBeTypeOf("object");
  expect(res.body.success).toBe(true);
  expect(res.body.data).toBeDefined();
}

export function expectFailure(res: Response, status: number): void {
  expect(res.status).toBe(status);
  expect(res.body).toBeTypeOf("object");
  expect(res.body.success).toBe(false);
  expect(res.body.message).toBeTypeOf("string");
}

/** 400 from a Zod `.parse()` failure surfaced by errorHandler. */
export function expectValidationFailure(res: Response): void {
  expectFailure(res, 400);
  expect(res.body.message).toBe("Validation failed");
  expect(Array.isArray(res.body.errors)).toBe(true);
}

export function expectUnauthorized(res: Response): void {
  expectFailure(res, 401);
}
