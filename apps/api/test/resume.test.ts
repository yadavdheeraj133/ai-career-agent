/**
 * Endpoints 7-10 — /resume (POST, GET, PATCH, DELETE)
 * routes/resume.route.ts
 *
 * Note: ResumeController catches every error inline and maps it to 400 (create
 * / update) or 404 (get / delete) rather than delegating to the shared error
 * handler. The assertions below pin down that observed behaviour.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized } from "./helpers/http.js";
import { validResume } from "./fixtures/requests.js";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("POST /resume", () => {
  it("creates a resume and returns 201", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/resume")
      .set(bearer(user.token))
      .send(validResume());

    expectSuccess(res, 201);
    expect(res.body.message).toBe("Resume created successfully.");
    expect(res.body.data.title).toBe("My Resume");
    expect(res.body.data.userId).toBe(user.id);
  });

  it("persists the resume and stores structured sections as JSON", async () => {
    const user = await createUser(app);
    const payload = validResume();

    await request(app).post("/resume").set(bearer(user.token)).send(payload).expect(201);

    const stored = await prisma.resume.findUnique({ where: { userId: user.id } });

    expect(stored).not.toBeNull();
    expect(stored!.skills).toEqual(payload.skills);
    expect(stored!.experience).toEqual(payload.experience);
  });

  it("returns 400 when the user already has a resume", async () => {
    const user = await createUser(app);

    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);

    const res = await request(app)
      .post("/resume")
      .set(bearer(user.token))
      .send(validResume());

    expectFailure(res, 400);
    expect(res.body.message).toBe("Resume already exists.");
  });

  it("rejects a missing title", async () => {
    const user = await createUser(app);
    const { title, ...withoutTitle } = validResume();

    const res = await request(app)
      .post("/resume")
      .set(bearer(user.token))
      .send(withoutTitle);

    expectFailure(res, 400);
  });

  it("rejects a title shorter than 3 characters", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/resume")
      .set(bearer(user.token))
      .send(validResume({ title: "ab" }));

    expectFailure(res, 400);
  });

  it("rejects a title longer than 100 characters", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/resume")
      .set(bearer(user.token))
      .send(validResume({ title: "a".repeat(101) }));

    expectFailure(res, 400);
  });

  it("rejects an empty body", async () => {
    const user = await createUser(app);

    expectFailure(
      await request(app).post("/resume").set(bearer(user.token)).send({}),
      400
    );
  });

  it("rejects a malformed nested project URL", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/resume")
      .set(bearer(user.token))
      .send(
        validResume({
          projects: [{ title: "P", description: "D", github: "not-a-url" }],
        })
      );

    expectFailure(res, 400);
  });

  it("creates only the minimal valid resume", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .post("/resume")
      .set(bearer(user.token))
      .send({ title: "Minimal Resume" });

    expectSuccess(res, 201);
    expect(res.body.data.template).toBe("modern");
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).post("/resume").send(validResume()));
  });

  it("does not create a resume when unauthenticated", async () => {
    await request(app).post("/resume").send(validResume());

    expect(await prisma.resume.count()).toBe(0);
  });

  it("scopes resumes to their owner", async () => {
    const alice = await createUser(app);
    const bob = await createUser(app);

    await request(app).post("/resume").set(bearer(alice.token)).send(validResume({ title: "Alice Resume" })).expect(201);

    // Bob has no resume of his own, so his POST must succeed rather than
    // colliding with Alice's row.
    const res = await request(app)
      .post("/resume")
      .set(bearer(bob.token))
      .send(validResume({ title: "Bob Resume" }));

    expectSuccess(res, 201);
    expect(await prisma.resume.count()).toBe(2);
  });
});

describe("GET /resume", () => {
  it("returns the authenticated user's resume", async () => {
    const user = await createUser(app);

    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);

    const res = await request(app).get("/resume").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.title).toBe("My Resume");
  });

  it("returns 404 when no resume exists", async () => {
    const user = await createUser(app);

    const res = await request(app).get("/resume").set(bearer(user.token));

    expectFailure(res, 404);
    expect(res.body.message).toBe("Resume not found.");
  });

  it("does not return another user's resume", async () => {
    const alice = await createUser(app);
    const bob = await createUser(app);

    await request(app).post("/resume").set(bearer(alice.token)).send(validResume()).expect(201);

    expectFailure(
      await request(app).get("/resume").set(bearer(bob.token)),
      404
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/resume"));
  });
});

describe("PATCH /resume", () => {
  it("updates the resume and returns 200", async () => {
    const user = await createUser(app);

    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);

    const res = await request(app)
      .patch("/resume")
      .set(bearer(user.token))
      .send({ summary: "Updated summary." });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Resume updated successfully.");
    expect(res.body.data.summary).toBe("Updated summary.");
  });

  it("persists the update", async () => {
    const user = await createUser(app);

    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);
    await request(app).patch("/resume").set(bearer(user.token)).send({ title: "New Title" }).expect(200);

    const stored = await prisma.resume.findUnique({ where: { userId: user.id } });
    expect(stored!.title).toBe("New Title");
  });

  it("rejects an invalid field value", async () => {
    const user = await createUser(app);

    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);

    const res = await request(app)
      .patch("/resume")
      .set(bearer(user.token))
      .send({ title: "ab" });

    expectFailure(res, 400);
  });

  it("returns 400 when the user has no resume", async () => {
    const user = await createUser(app);

    const res = await request(app)
      .patch("/resume")
      .set(bearer(user.token))
      .send({ summary: "Nothing to update." });

    expectFailure(res, 400);
    expect(res.body.message).toBe("Resume not found.");
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).patch("/resume").send({ summary: "x" })
    );
  });
});

describe("DELETE /resume", () => {
  it("deletes the resume and returns 200", async () => {
    const user = await createUser(app);

    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);

    const res = await request(app).delete("/resume").set(bearer(user.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Resume deleted successfully.");
    expect(await prisma.resume.count()).toBe(0);
  });

  it("returns 404 when no resume exists", async () => {
    const user = await createUser(app);

    const res = await request(app).delete("/resume").set(bearer(user.token));

    expectFailure(res, 404);
  });

  it("leaves the user account intact", async () => {
    const user = await createUser(app);

    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);
    await request(app).delete("/resume").set(bearer(user.token)).expect(200);

    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).delete("/resume"));
  });
});
