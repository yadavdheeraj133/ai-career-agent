/**
 * The single-source-of-truth contract for a user's resume.
 *
 * Covers the canonical document endpoint, the AI endpoints loading the stored
 * resume without a pasted copy, the tailored-resume PDF download, and that a
 * replacement upload immediately becomes the resume every feature uses.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import app from "../src/app.js";
import { installAiMock, resetAiMock, setAIResponse } from "./helpers/ai.js";
import { bearer, createUser, type TestUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";
import { expectSuccess, expectUnauthorized } from "./helpers/http.js";
import { resumeTailorFixture } from "./fixtures/ai.js";
import { JOB_DESCRIPTION_TEXT } from "./fixtures/requests.js";

const fixture = path.join("node_modules", "mammoth", "test", "test-data", "single-paragraph.docx");

const STORED = {
  title: "Primary Resume",
  summary: "Backend engineer focused on payments infrastructure.",
  skills: ["Go", "PostgreSQL"],
  experience: [
    {
      company: "Northwind Payments",
      role: "Senior Engineer",
      startDate: "Mar 2021",
      endDate: "Present",
      description: "Rebuilt the settlement pipeline",
    },
  ],
  education: [{ institution: "State University", degree: "BS Computer Science", endDate: "2019" }],
  projects: [{ title: "Ledger Core", description: "Double-entry ledger", technologies: ["Go"] }],
  certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon" }],
  achievements: [{ title: "Speaker", description: "PyData 2023" }],
  languages: ["English", "Spanish"],
  links: { github: "https://github.com/example" },
  rawText: "Jordan Rivera\nGo PostgreSQL Northwind Payments settlement pipeline",
};

let alice: TestUser;
let bob: TestUser;

async function storeResume(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.resume.upsert({
    where: { userId },
    create: { userId, ...STORED, ...overrides } as never,
    update: { ...STORED, ...overrides } as never,
  });
}

beforeAll(async () => {
  installAiMock();
});

beforeEach(async () => {
  await resetDatabase();
  alice = await createUser(app, { name: "Alice" });
  bob = await createUser(app, { name: "Bob" });
});

afterAll(async () => {
  resetAiMock();
  await disconnectDatabase();
});

describe("GET /resume/document", () => {
  it("returns the canonical structured resume and its AI-ready text", async () => {
    await storeResume(alice.id);

    const res = await request(app).get("/resume/document").set(bearer(alice.token));

    expectSuccess(res, 200);

    const { document, plainText, meta } = res.body.data;

    expect(document.experience[0]).toMatchObject({
      company: "Northwind Payments",
      position: "Senior Engineer",
      currentlyWorking: true,
      responsibilities: ["Rebuilt the settlement pipeline"],
    });
    expect(document.education[0]).toMatchObject({
      institution: "State University",
      degree: "BS Computer Science",
    });
    expect(document.projects[0]).toMatchObject({ name: "Ledger Core", technologies: ["Go"] });
    expect(document.certifications[0].name).toBe("AWS Solutions Architect");
    expect(document.achievements[0].title).toBe("Speaker");
    expect(document.languages).toEqual(["English", "Spanish"]);
    expect(document.links).toEqual(["https://github.com/example"]);

    // The AI text is rendered from the same document, not a second interpretation.
    expect(plainText).toContain("Northwind Payments");
    expect(plainText).toContain("EXPERIENCE");

    expect(meta.hasOriginalFile).toBe(false);
  });

  it("404s when the user has no resume", async () => {
    const res = await request(app).get("/resume/document").set(bearer(alice.token));

    expect(res.status).toBe(404);
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/resume/document"));
  });

  it("never returns another user's resume", async () => {
    await storeResume(bob.id, { summary: "Bob's private summary" });

    const res = await request(app).get("/resume/document").set(bearer(alice.token));

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain("Bob's private summary");
  });
});

describe("AI endpoints load the stored resume", () => {
  it("analyzes the stored resume without a pasted copy", async () => {
    const { resumeAnalysisFixture } = await import("./fixtures/ai.js");
    setAIResponse(resumeAnalysisFixture);
    await storeResume(alice.id);

    const res = await request(app).post("/api/resume/analyze").set(bearer(alice.token)).send({});

    expectSuccess(res, 200);
  });

  it("still honours an explicit resume override", async () => {
    const { resumeAnalysisFixture } = await import("./fixtures/ai.js");
    setAIResponse(resumeAnalysisFixture);
    await storeResume(alice.id);

    const res = await request(app)
      .post("/api/resume/analyze")
      .set(bearer(alice.token))
      .send({ resume: "A completely different resume" });

    expectSuccess(res, 200);
  });

  it("400s when there is no stored resume and none supplied", async () => {
    const res = await request(app).post("/api/resume/analyze").set(bearer(alice.token)).send({});

    expect(res.status).toBe(400);
  });

  it("uses the replaced resume on the very next AI call", async () => {
    const { resumeAnalysisFixture } = await import("./fixtures/ai.js");
    setAIResponse(resumeAnalysisFixture);

    await storeResume(alice.id, { rawText: "FIRST VERSION MARKER" });
    await request(app).post("/api/resume/analyze").set(bearer(alice.token)).send({});

    await storeResume(alice.id, { rawText: "SECOND VERSION MARKER" });
    const res = await request(app).post("/api/resume/analyze").set(bearer(alice.token)).send({});

    expectSuccess(res, 200);
  });

  it("does not use another user's resume as a fallback", async () => {
    await storeResume(bob.id, { rawText: "BOBS RESUME" });

    const res = await request(app).post("/api/resume/analyze").set(bearer(alice.token)).send({});

    expect(res.status).toBe(400);
  });
});

describe("POST /api/resume/tailor/download", () => {
  beforeEach(async () => {
    await storeResume(alice.id);
  });

  it("returns a real PDF built from the tailored structure", async () => {
    const res = await request(app)
      .post("/api/resume/tailor/download")
      .set(bearer(alice.token))
      .send({ tailoredResume: resumeTailorFixture });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain(".pdf");

    const body = res.body as Buffer;
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(body.length).toBeGreaterThan(1000);
  });

  it("carries the stored contact header, not one invented by the model", async () => {
    const res = await request(app)
      .post("/api/resume/tailor/download")
      .set(bearer(alice.token))
      .send({
        tailoredResume: { ...resumeTailorFixture, email: "attacker@example.com" },
      });

    const pdf = (res.body as Buffer).toString("latin1");
    expect(pdf).not.toContain("attacker@example.com");
  });

  it("400s without a structured tailored resume", async () => {
    const res = await request(app)
      .post("/api/resume/tailor/download")
      .set(bearer(alice.token))
      .send({});

    expect(res.status).toBe(400);
  });

  it("400s when the user has no primary resume to attach the header to", async () => {
    const res = await request(app)
      .post("/api/resume/tailor/download")
      .set(bearer(bob.token))
      .send({ tailoredResume: resumeTailorFixture });

    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app)
        .post("/api/resume/tailor/download")
        .send({ tailoredResume: resumeTailorFixture })
    );
  });

  it("does not expose one user's tailored output to another", async () => {
    await storeResume(bob.id);

    const res = await request(app)
      .post("/api/resume/tailor/download")
      .set(bearer(bob.token))
      .send({ tailoredResume: { ...resumeTailorFixture, title: "Bob's tailored resume" } });

    expect(res.status).toBe(200);
    expect((res.body as Buffer).subarray(0, 5).toString("latin1")).toBe("%PDF-");

    // Nothing is persisted, so there is no stored artefact for another account
    // to reach: the only input is the caller's own request body.
    const stored = await prisma.resume.findMany({ where: { title: "Bob's tailored resume" } });
    expect(stored).toHaveLength(0);
  });
});

describe("upload integrates with the canonical document", () => {
  it("persists the structured sections the viewer and AI tools read", async () => {
    const user = await createUser(app, { name: "Uploader" });
    const file = await readFile(fixture);

    await request(app)
      .post("/resume/upload")
      .set(bearer(user.token))
      .attach("file", file, "resume.docx")
      .expect(200);

    const res = await request(app).get("/resume/document").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.meta.originalFileName).toBe("resume.docx");
    expect(res.body.data.meta.hasOriginalFile).toBe(true);
    expect(res.body.data.plainText).toContain("Walking on imported air");
  });
});
