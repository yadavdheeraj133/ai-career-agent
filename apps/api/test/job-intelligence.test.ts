/**
 * Endpoints 32-38 — job intelligence, all mounted under /api/jobs
 *   routes/job-aggregator.route.ts   POST   /api/jobs/aggregate
 *   routes/job-search.route.ts       GET    /api/jobs/search
 *   routes/job-matching.route.ts     POST   /api/jobs/match
 *   routes/job-bookmark.route.ts     POST   /api/jobs/:id/bookmark
 *                                    DELETE /api/jobs/:id/bookmark
 *   routes/job-application.route.ts  POST   /api/jobs/applications
 *                                    GET    /api/jobs/applications/:jobId
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

function aggregatedJob(overrides: Record<string, unknown> = {}) {
  return {
    title: "Backend Engineer",
    company: "Acme",
    location: "Remote",
    workMode: "Remote",
    jobType: "Full-time",
    experience: "3-5 years",
    salary: "$120k",
    description: "TypeScript and PostgreSQL services.",
    source: "LinkedIn",
    url: `https://example.test/aggregate/${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

async function seedJob(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/jobs")
    .set(bearer(user.token))
    .send({
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
      description: "TypeScript and PostgreSQL services.",
      source: "LinkedIn",
      url: `https://example.test/seed/${Math.random().toString(36).slice(2)}`,
      ...overrides,
    });

  if (res.status !== 201) {
    throw new Error(`seedJob failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.data as { id: string };
}

describe("POST /api/jobs/aggregate", () => {
  it("creates the supplied jobs and reports counts", async () => {
    const jobs = [aggregatedJob(), aggregatedJob()];

    const res = await request(app)
      .post("/api/jobs/aggregate")
      .set(bearer(user.token))
      .send({ jobs });

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Jobs aggregated successfully.");
    expect(res.body.data).toMatchObject({ fetched: 2, created: 2, skipped: 0 });
    expect(res.body.data.source).toBe("LinkedIn");

    expect(await prisma.job.count()).toBe(2);
  });

  it("skips a job whose URL already exists", async () => {
    const job = aggregatedJob();

    await request(app).post("/api/jobs/aggregate").set(bearer(user.token)).send({ jobs: [job] }).expect(200);

    const res = await request(app)
      .post("/api/jobs/aggregate")
      .set(bearer(user.token))
      .send({ jobs: [job] });

    expectSuccess(res, 200);
    expect(res.body.data).toMatchObject({ fetched: 1, created: 0, skipped: 1 });
    expect(await prisma.job.count()).toBe(1);
  });

  it("skips duplicate URLs inside a single payload", async () => {
    const job = aggregatedJob();

    const res = await request(app)
      .post("/api/jobs/aggregate")
      .set(bearer(user.token))
      .send({ jobs: [job, job] });

    expectSuccess(res, 200);
    expect(res.body.data).toMatchObject({ fetched: 2, created: 1, skipped: 1 });
  });

  it("rejects a missing jobs array", async () => {
    expectFailure(
      await request(app).post("/api/jobs/aggregate").set(bearer(user.token)).send({}),
      400
    );
  });

  it("rejects an empty jobs array", async () => {
    const res = await request(app)
      .post("/api/jobs/aggregate")
      .set(bearer(user.token))
      .send({ jobs: [] });

    expectFailure(res, 400);
    expect(res.body.message).toBe("jobs is required and must be a non-empty array.");
  });

  it("rejects a non-array jobs value", async () => {
    expectFailure(
      await request(app).post("/api/jobs/aggregate").set(bearer(user.token)).send({ jobs: "nope" }),
      400
    );
  });

  it("creates no jobs when validation fails", async () => {
    await request(app).post("/api/jobs/aggregate").set(bearer(user.token)).send({ jobs: [] });

    expect(await prisma.job.count()).toBe(0);
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/jobs/aggregate").send({ jobs: [aggregatedJob()] })
    );
    expect(await prisma.job.count()).toBe(0);
  });
});

describe("GET /api/jobs/search", () => {
  it("returns an empty list when there are no jobs", async () => {
    const res = await request(app).get("/api/jobs/search").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.count).toBe(0);
    expect(res.body.data).toEqual([]);
  });

  it("returns every job when no filters are supplied", async () => {
    await seedJob();
    await seedJob();

    const res = await request(app).get("/api/jobs/search").set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.count).toBe(2);
  });

  it("filters by keyword against the title", async () => {
    await seedJob({ title: "Backend Engineer" });
    await seedJob({ title: "Product Designer" });

    const res = await request(app)
      .get("/api/jobs/search?keyword=designer")
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].title).toBe("Product Designer");
  });

  it("matches the keyword case-insensitively", async () => {
    await seedJob({ title: "Backend Engineer" });

    const res = await request(app)
      .get("/api/jobs/search?keyword=BACKEND")
      .set(bearer(user.token));

    expect(res.body.count).toBe(1);
  });

  it("filters by keyword against company and description", async () => {
    await seedJob({ company: "Globex", description: "Nothing relevant." });
    await seedJob({ company: "Acme", description: "Kubernetes and Go." });

    const byCompany = await request(app)
      .get("/api/jobs/search?keyword=globex")
      .set(bearer(user.token));

    const byDescription = await request(app)
      .get("/api/jobs/search?keyword=kubernetes")
      .set(bearer(user.token));

    expect(byCompany.body.count).toBe(1);
    expect(byDescription.body.count).toBe(1);
  });

  it("filters by location", async () => {
    await seedJob({ location: "Berlin" });
    await seedJob({ location: "Remote" });

    const res = await request(app)
      .get("/api/jobs/search?location=berlin")
      .set(bearer(user.token));

    expect(res.body.count).toBe(1);
    expect(res.body.data[0].location).toBe("Berlin");
  });

  it("filters by workMode", async () => {
    await seedJob({ workMode: "Remote" });
    await seedJob({ workMode: "Hybrid" });

    const res = await request(app)
      .get("/api/jobs/search?workMode=Hybrid")
      .set(bearer(user.token));

    expect(res.body.count).toBe(1);
    expect(res.body.data[0].workMode).toBe("Hybrid");
  });

  it("filters by jobType", async () => {
    await seedJob({ jobType: "Full-time" });
    await seedJob({ jobType: "Internship" });

    const res = await request(app)
      .get("/api/jobs/search?jobType=Internship")
      .set(bearer(user.token));

    expect(res.body.count).toBe(1);
  });

  it("filters by experience level", async () => {
    await seedJob({ experience: "1-3 years" });
    await seedJob({ experience: "5+ years" });

    const res = await request(app)
      .get("/api/jobs/search?experience=1-3%20years")
      .set(bearer(user.token));

    expect(res.body.count).toBe(1);
    expect(res.body.data[0].experience).toBe("1-3 years");
  });

  it("filters by source case-insensitively", async () => {
    await seedJob({ source: "LinkedIn" });
    await seedJob({ source: "Wellfound" });

    const res = await request(app)
      .get("/api/jobs/search?source=wellfound")
      .set(bearer(user.token));

    expect(res.body.count).toBe(1);
  });

  it("combines multiple filters", async () => {
    await seedJob({ title: "Backend Engineer", location: "Berlin", workMode: "Hybrid" });
    await seedJob({ title: "Backend Engineer", location: "Remote", workMode: "Remote" });

    const res = await request(app)
      .get("/api/jobs/search?keyword=backend&location=berlin&workMode=Hybrid")
      .set(bearer(user.token));

    expect(res.body.count).toBe(1);
    expect(res.body.data[0].location).toBe("Berlin");
  });

  it("returns an empty list when nothing matches", async () => {
    await seedJob();

    const res = await request(app)
      .get("/api/jobs/search?keyword=astrophysicist")
      .set(bearer(user.token));

    expect(res.body.count).toBe(0);
    expect(res.body.data).toEqual([]);
  });

  it("ignores non-string query parameters rather than crashing", async () => {
    await seedJob();

    const res = await request(app)
      .get("/api/jobs/search?keyword=a&keyword=b")
      .set(bearer(user.token));

    expectSuccess(res, 200);
  });

  it("requires authentication", async () => {
    expectUnauthorized(await request(app).get("/api/jobs/search"));
  });
});

describe("POST /api/jobs/match", () => {
  it("scores a fully-matching job at 100", async () => {
    await seedJob({
      title: "Backend Engineer",
      description: "TypeScript and PostgreSQL services.",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
    });

    const res = await request(app)
      .post("/api/jobs/match")
      .set(bearer(user.token))
      .send({ skills: ["typescript", "postgresql"] });

    expectSuccess(res, 200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].matchScore).toBe(100);
    expect(res.body.data[0].matchedSkills).toEqual(["typescript", "postgresql"]);
    expect(res.body.data[0].missingSkills).toEqual([]);
  });

  it("reports skills that are absent from the job text", async () => {
    await seedJob({ description: "TypeScript only." });

    const res = await request(app)
      .post("/api/jobs/match")
      .set(bearer(user.token))
      .send({ skills: ["typescript", "rust"] });

    expect(res.body.data[0].missingSkills).toEqual(["rust"]);
    expect(res.body.data[0].matchedSkills).toEqual(["typescript"]);
  });

  it("sorts results by descending match score", async () => {
    await seedJob({ title: "Backend Engineer", description: "TypeScript." });
    await seedJob({ title: "Data Scientist", description: "Python and R." });

    const res = await request(app)
      .post("/api/jobs/match")
      .set(bearer(user.token))
      .send({ skills: ["typescript"] });

    const scores = res.body.data.map((r: { matchScore: number }) => r.matchScore);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
  });

  it("subtracts the location bonus when the location does not match", async () => {
    await seedJob({ location: "Berlin", description: "TypeScript." });

    const res = await request(app)
      .post("/api/jobs/match")
      .set(bearer(user.token))
      .send({ skills: ["typescript"], preferredLocation: "Tokyo" });

    // 70 skill + 0 location + 10 workMode + 10 jobType
    expect(res.body.data[0].matchScore).toBe(90);
  });

  it("subtracts the work-mode and job-type bonuses when they differ", async () => {
    await seedJob({ workMode: "Hybrid", jobType: "Contract", description: "TypeScript." });

    const res = await request(app)
      .post("/api/jobs/match")
      .set(bearer(user.token))
      .send({ skills: ["typescript"], preferredWorkMode: "Remote", preferredJobType: "Full-time" });

    // 70 skill + 10 location (unspecified) + 0 workMode + 0 jobType
    expect(res.body.data[0].matchScore).toBe(80);
  });

  it("returns an empty list when there are no jobs", async () => {
    const res = await request(app)
      .post("/api/jobs/match")
      .set(bearer(user.token))
      .send({ skills: ["typescript"] });

    expectSuccess(res, 200);
    expect(res.body.count).toBe(0);
  });

  it("rejects a missing skills array", async () => {
    expectFailure(
      await request(app).post("/api/jobs/match").set(bearer(user.token)).send({}),
      400
    );
  });

  it("rejects an empty skills array", async () => {
    const res = await request(app)
      .post("/api/jobs/match")
      .set(bearer(user.token))
      .send({ skills: [] });

    expectFailure(res, 400);
    expect(res.body.message).toBe("skills is required and must be a non-empty array of strings.");
  });

  it("rejects a non-array skills value", async () => {
    expectFailure(
      await request(app).post("/api/jobs/match").set(bearer(user.token)).send({ skills: "typescript" }),
      400
    );
  });

  it("requires authentication", async () => {
    expectUnauthorized(
      await request(app).post("/api/jobs/match").send({ skills: ["typescript"] })
    );
  });
});

describe("POST /api/jobs/:id/bookmark", () => {
  it("bookmarks an existing job", async () => {
    const job = await seedJob();

    const res = await request(app)
      .post(`/api/jobs/${job.id}/bookmark`)
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Job bookmarked successfully");
    expect(res.body.data).toEqual({ jobId: job.id, bookmarked: true });
  });

  it("returns 404 for an unknown job id", async () => {
    const res = await request(app)
      .post("/api/jobs/cuid-does-not-exist/bookmark")
      .set(bearer(user.token));

    expectFailure(res, 404);
    expect(res.body.message).toBe("Job not found");
  });

  it("requires authentication", async () => {
    const job = await seedJob();

    expectUnauthorized(await request(app).post(`/api/jobs/${job.id}/bookmark`));
  });
});

describe("DELETE /api/jobs/:id/bookmark", () => {
  it("removes a bookmark from an existing job", async () => {
    const job = await seedJob();

    const res = await request(app)
      .delete(`/api/jobs/${job.id}/bookmark`)
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.message).toBe("Job bookmark removed successfully");
    expect(res.body.data).toEqual({ jobId: job.id, bookmarked: false });
  });

  it("returns 404 for an unknown job id", async () => {
    const res = await request(app)
      .delete("/api/jobs/cuid-does-not-exist/bookmark")
      .set(bearer(user.token));

    expectFailure(res, 404);
  });

  it("requires authentication", async () => {
    const job = await seedJob();

    expectUnauthorized(await request(app).delete(`/api/jobs/${job.id}/bookmark`));
  });
});

describe("POST /api/jobs/applications", () => {
  it("creates an application and returns 201", async () => {
    const job = await seedJob();

    const res = await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ jobId: job.id, status: "Applied" });

    expectSuccess(res, 201);
    expect(res.body.message).toBe("Job application created successfully.");
    expect(res.body.data).toMatchObject({
      jobId: job.id,
      status: "Applied",
      notes: "",
    });
    expect(res.body.data.appliedAt).toBeTypeOf("string");
    expect(res.body.data.job).toMatchObject({
      title: "Backend Engineer",
      company: "Acme",
    });
  });

  it("honours an explicit appliedAt and notes", async () => {
    const job = await seedJob();

    const res = await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({
        jobId: job.id,
        status: "Interview",
        appliedAt: "2026-01-01T00:00:00.000Z",
        notes: "Referred by a friend.",
      });

    expectSuccess(res, 201);
    expect(res.body.data.appliedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(res.body.data.notes).toBe("Referred by a friend.");
  });

  it("accepts every allowed status value", async () => {
    const job = await seedJob();

    for (const status of ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"]) {
      const res = await request(app)
        .post("/api/jobs/applications")
        .set(bearer(user.token))
        .send({ jobId: job.id, status });

      expectSuccess(res, 201);
    }
  });

  it("rejects a missing jobId", async () => {
    const res = await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ status: "Applied" });

    expectFailure(res, 400);
    expect(res.body.message).toBe("jobId is required and must be a string.");
  });

  it("rejects a non-string jobId", async () => {
    expectFailure(
      await request(app)
        .post("/api/jobs/applications")
        .set(bearer(user.token))
        .send({ jobId: 123, status: "Applied" }),
      400
    );
  });

  it("rejects a missing status", async () => {
    const job = await seedJob();

    const res = await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ jobId: job.id });

    expectFailure(res, 400);
  });

  it("rejects a status outside the allowed set", async () => {
    const job = await seedJob();

    const res = await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ jobId: job.id, status: "Ghosted" });

    expectFailure(res, 400);
    expect(res.body.message).toContain("Applied");
  });

  it("returns 404 when the job does not exist", async () => {
    const res = await request(app)
      .post("/api/jobs/applications")
      .set(bearer(user.token))
      .send({ jobId: "cuid-does-not-exist", status: "Applied" });

    expectFailure(res, 404);
    expect(res.body.message).toBe("Job not found");
  });

  it("requires authentication", async () => {
    const job = await seedJob();

    expectUnauthorized(
      await request(app).post("/api/jobs/applications").send({ jobId: job.id, status: "Applied" })
    );
  });
});

describe("GET /api/jobs/applications/:jobId", () => {
  it("returns the application view for an existing job", async () => {
    const job = await seedJob();

    const res = await request(app)
      .get(`/api/jobs/applications/${job.id}`)
      .set(bearer(user.token));

    expectSuccess(res, 200);
    expect(res.body.data.jobId).toBe(job.id);
    expect(res.body.data.job).toMatchObject({
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
    });
  });

  it("returns 404 for an unknown job id", async () => {
    const res = await request(app)
      .get("/api/jobs/applications/cuid-does-not-exist")
      .set(bearer(user.token));

    expectFailure(res, 404);
  });

  it("requires authentication", async () => {
    const job = await seedJob();

    expectUnauthorized(await request(app).get(`/api/jobs/applications/${job.id}`));
  });
});
