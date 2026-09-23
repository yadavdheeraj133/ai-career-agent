/**
 * Phase 3 — notifications API + application update alerts.
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

async function seedNotification(
  overrides: {
    userId?: string;
    type?: string;
    readAt?: Date | null;
  } = {}
) {
  return prisma.notification.create({
    data: {
      userId: overrides.userId ?? user.id,
      type: overrides.type ?? "NEW_JOB",
      title: "New job match",
      message: "A new job matches your preferences",
      ...(overrides.readAt === undefined ? {} : { readAt: overrides.readAt }),
    },
  });
}

describe("GET /api/notifications", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/notifications");
    expectUnauthorized(res);
  });

  it("lists the current user's notifications with an unread count", async () => {
    await seedNotification();
    await seedNotification({ readAt: new Date() });

    const res = await request(app)
      .get("/api/notifications")
      .set(bearer(user.token));

    expectSuccess(res);
    expect(res.body.count).toBe(2);
    expect(res.body.unread).toBe(1);
    expect(res.body.data[0]).toMatchObject({
      type: "NEW_JOB",
      read: expect.any(Boolean),
    });
  });

  it("does not leak another user's notifications", async () => {
    const other = await createUser(app);
    await seedNotification({ userId: other.id });

    const res = await request(app)
      .get("/api/notifications")
      .set(bearer(user.token));

    expectSuccess(res);
    expect(res.body.count).toBe(0);
  });

  it("can return only unread notifications", async () => {
    await seedNotification();
    await seedNotification({ readAt: new Date() });

    const res = await request(app)
      .get("/api/notifications?unreadOnly=true")
      .set(bearer(user.token));

    expectSuccess(res);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].read).toBe(false);
  });
});

describe("PATCH /api/notifications/:id/read", () => {
  it("marks a notification as read", async () => {
    const notification = await seedNotification();

    const res = await request(app)
      .patch(`/api/notifications/${notification.id}/read`)
      .set(bearer(user.token));

    expectSuccess(res);
    expect(res.body.data).toMatchObject({ id: notification.id, read: true });

    const stored = await prisma.notification.findUniqueOrThrow({
      where: { id: notification.id },
    });
    expect(stored.readAt).not.toBeNull();
  });

  it("returns 404 for an unknown notification", async () => {
    const res = await request(app)
      .patch("/api/notifications/does-not-exist/read")
      .set(bearer(user.token));

    expectFailure(res, 404);
  });

  it("cannot mark another user's notification as read", async () => {
    const other = await createUser(app);
    const notification = await seedNotification({ userId: other.id });

    const res = await request(app)
      .patch(`/api/notifications/${notification.id}/read`)
      .set(bearer(user.token));

    expectFailure(res, 404);
  });
});

describe("POST /api/notifications/read-all", () => {
  it("marks every unread notification as read", async () => {
    await seedNotification();
    await seedNotification();

    const res = await request(app)
      .post("/api/notifications/read-all")
      .set(bearer(user.token));

    expectSuccess(res);
    expect(res.body.data.updated).toBe(2);
    expect(
      await prisma.notification.count({ where: { userId: user.id, readAt: null } })
    ).toBe(0);
  });
});

describe("application update alerts", () => {
  async function seedJob() {
    return prisma.job.create({
      data: {
        title: "Backend Engineer",
        company: "Acme",
        location: "Remote",
        workMode: "Remote",
        jobType: "Full-time",
        source: "LinkedIn",
        url: `https://example.test/jobs/${Math.random().toString(36).slice(2)}`,
      },
    });
  }

  it("creates an APPLICATION_UPDATE notification when the status changes", async () => {
    const job = await seedJob();
    await prisma.userSettings.create({
      data: { userId: user.id, applicationUpdates: true },
    });

    const created = await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ jobId: job.id, status: "Applied" });
    expectSuccess(created, 201);

    const updated = await request(app)
      .patch(`/api/jobs/applications/${created.body.data.id}`)
      .set(bearer(user.token))
      .send({ status: "Interview" });
    expectSuccess(updated);

    const notification = await prisma.notification.findFirst({
      where: { userId: user.id, type: "APPLICATION_UPDATE" },
    });
    expect(notification).not.toBeNull();
    expect(notification!.message).toContain("Interview");
  });

  it("respects the applicationUpdates setting", async () => {
    const job = await seedJob();
    await prisma.userSettings.create({
      data: { userId: user.id, applicationUpdates: false },
    });

    const created = await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ jobId: job.id, status: "Applied" });

    await request(app)
      .patch(`/api/jobs/applications/${created.body.data.id}`)
      .set(bearer(user.token))
      .send({ status: "Offer" });

    expect(
      await prisma.notification.count({ where: { type: "APPLICATION_UPDATE" } })
    ).toBe(0);
  });
});
