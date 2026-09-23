import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import app from "../src/app.js";
import { bearer, createUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";

const fixture = path.join("node_modules", "mammoth", "test", "test-data", "single-paragraph.docx");

describe("resume upload and extraction", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("extracts and persists the authenticated user's DOCX resume", async () => {
    const user = await createUser(app);
    const file = await readFile(fixture);

    const upload = await request(app)
      .post("/resume/upload")
      .set(bearer(user.token))
      .attach("file", file, "resume.docx")
      .expect(200);

    expect(upload.body.data.userId).toBe(user.id);
    expect(upload.body.data.originalFileName).toBe("resume.docx");
    expect(upload.body.data.parsedProfile).toMatchObject({
      name: "Walking on imported air",
    });

    const stored = await prisma.resume.findUnique({ where: { userId: user.id } });
    expect(stored?.rawText).toContain("Walking on imported air");
    expect(stored?.storagePath).toContain("resumes/");
  });

  it("rejects unsupported files and does not expose another user's file", async () => {
    const alice = await createUser(app, { name: "Alice" });
    const bob = await createUser(app, { name: "Bob" });

    await request(app)
      .post("/resume/upload")
      .set(bearer(alice.token))
      .attach("file", Buffer.from("not a document"), "resume.txt")
      .expect(400);

    await request(app)
      .get("/resume/file")
      .set(bearer(alice.token))
      .expect(404);

    await request(app)
      .get("/resume/file")
      .set(bearer(bob.token))
      .expect(404);
  });
});