import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";

describe("authenticated skills", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("persists, scopes, and removes skills for the authenticated user", async () => {
    const user = await createUser(app);
    const otherUser = await createUser(app, { name: "Other User" });

    await request(app)
      .get("/api/skills")
      .set(bearer(user.token))
      .expect(200, { success: true, data: [] });

    const created = await request(app)
      .post("/api/skills")
      .set(bearer(user.token))
      .send({ name: " TypeScript " })
      .expect(201);

    expect(created.body.data).toMatchObject({
      name: "TypeScript",
      userId: user.id,
    });

    await request(app)
      .post("/api/skills")
      .set(bearer(user.token))
      .send({ name: "typescript" })
      .expect(201);

    const persisted = await request(app)
      .get("/api/skills")
      .set(bearer(user.token))
      .expect(200);

    expect(persisted.body.data).toHaveLength(1);
    expect(await prisma.skill.count({ where: { userId: user.id } })).toBe(1);

    const otherSkills = await request(app)
      .get("/api/skills")
      .set(bearer(otherUser.token))
      .expect(200);

    expect(otherSkills.body.data).toEqual([]);

    await request(app)
      .delete(`/api/skills/${created.body.data.id}`)
      .set(bearer(user.token))
      .expect(204);

    expect(await prisma.skill.count({ where: { userId: user.id } })).toBe(0);
  });
});