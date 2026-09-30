/**
 * Non-tailored resume generation: POST /resume/generate and
 * POST /resume/generate/download.
 *
 * The contract being pinned down is that generation is a *layout* operation —
 * one approved template is applied to the resume that is already stored, the
 * stored row itself never changes, and the tailored flow is not involved.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { bearer, createUser } from "./helpers/auth.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";
import { expectFailure, expectSuccess, expectUnauthorized } from "./helpers/http.js";
import { validResume } from "./fixtures/requests.js";
import { RESUME_TEMPLATES } from "../src/services/resume-template.service.js";

const approvedIds = RESUME_TEMPLATES.map((template) => template.id);

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("POST /resume/generate", () => {
  it("requires authentication", async () => {
    expectUnauthorized(await request(app).post("/resume/generate").send({}));
  });

  it("400s when the user has no resume to generate from", async () => {
    const user = await createUser(app);

    expectFailure(
      await request(app).post("/resume/generate").set(bearer(user.token)).send({}),
      400
    );
  });

  it("lays the stored resume out in one approved template", async () => {
    const user = await createUser(app);
    const payload = validResume();
    await request(app).post("/resume").set(bearer(user.token)).send(payload).expect(201);

    const res = await request(app)
      .post("/resume/generate")
      .set(bearer(user.token))
      .send({});

    expectSuccess(res, 200);
    expect(approvedIds).toContain(res.body.data.template.id);

    // Only the user's own content is present, in the template's section order.
    const document = res.body.data.document;
    expect(document.summary).toBe(payload.summary);
    expect(document.skills).toEqual(payload.skills);
    expect(document.experience[0].company).toBe("Acme");
    expect(document.sectionOrder).toEqual(
      RESUME_TEMPLATES.find((template) => template.id === res.body.data.template.id)!
        .sectionOrder
    );
    expect(document.name).toBeNull();
  });

  it("honours an explicit template id and rejects an unknown one", async () => {
    const user = await createUser(app);
    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);

    const chosen = await request(app)
      .post("/resume/generate")
      .set(bearer(user.token))
      .send({ templateId: "education-first" });

    expectSuccess(chosen, 200);
    expect(chosen.body.data.template.id).toBe("education-first");
    expect(chosen.body.data.document.sectionOrder[0]).toBe("education");

    expectFailure(
      await request(app)
        .post("/resume/generate")
        .set(bearer(user.token))
        .send({ templateId: "not-a-template" }),
      400
    );
  });

  it("never writes the generated layout back over the stored resume", async () => {
    const user = await createUser(app);
    const payload = validResume();
    await request(app).post("/resume").set(bearer(user.token)).send(payload).expect(201);

    const before = await prisma.resume.findUnique({ where: { userId: user.id } });

    await request(app)
      .post("/resume/generate")
      .set(bearer(user.token))
      .send({ templateId: "compact-one-page" })
      .expect(200);

    const after = await prisma.resume.findUnique({ where: { userId: user.id } });
    expect(after?.skills).toEqual(before?.skills);
    expect(after?.summary).toBe(before?.summary);
    expect(JSON.stringify(after?.experience)).toBe(
      JSON.stringify(before?.experience)
    );
    expect(after?.parsedProfile).toEqual(before?.parsedProfile);
  });
});

describe("POST /resume/generate/download", () => {
  it("requires authentication", async () => {
    expectUnauthorized(await request(app).post("/resume/generate/download").send({}));
  });

  it("400s when the user has no resume", async () => {
    const user = await createUser(app);

    expectFailure(
      await request(app)
        .post("/resume/generate/download")
        .set(bearer(user.token))
        .send({}),
      400
    );
  });

  it("answers with a real PDF for the requested template", async () => {
    const user = await createUser(app);
    await request(app).post("/resume").set(bearer(user.token)).send(validResume()).expect(201);

    const res = await request(app)
      .post("/resume/generate/download")
      .set(bearer(user.token))
      .send({ templateId: "centered-header" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain(".pdf");

    const body = res.body as Buffer;
    expect(body.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(body.length).toBeGreaterThan(1000);
  });
});
