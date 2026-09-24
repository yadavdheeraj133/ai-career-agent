/**
 * Task 8 — job provider system.
 *
 * Verifies the deployment-configured provider architecture end to end:
 * fixture + generic HTTP JSON providers, normalization, deduplication
 * (including the UNIQUE(provider, externalId) constraint), bounded retries,
 * per-provider failure isolation, malformed-response safety, expiration, and
 * that provider secrets never appear in errors or logs.
 *
 * No real external provider is contacted: everything runs against the
 * isolated `_test` database with stubbed fetch boundaries.
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  AutomationAggregationService,
  ExpirationService,
  FixtureJobProvider,
  HttpJsonJobProvider,
  HttpError,
  IngestionService,
  TransientError,
  createProviders,
  loadAutomationConfig,
  normalizeRawJob,
  parseProviderUrls,
} from "../src/automation/index.js";
import { disconnectDatabase, prisma, resetDatabase } from "./helpers/db.js";

let unique = 0;

function rawJob(overrides: Record<string, unknown> = {}) {
  unique += 1;
  return {
    title: "Backend Engineer",
    company: "Acme",
    location: "Remote",
    workMode: "remote",
    jobType: "full-time",
    description: "Build the payments pipeline.",
    url: `https://example.test/provider-jobs/${unique}`,
    externalId: `ext-${unique}`,
    ...overrides,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(
    typeof payload === "string" ? payload : JSON.stringify(payload),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

function ingestionService(onRetry?: (info: { provider: string; attempt: number }) => void) {
  const aggregation = new AutomationAggregationService();
  return new IngestionService(aggregation, {
    maxAttempts: 3,
    baseBackoffMs: 1,
    maxBackoffMs: 5,
    maxJobsPerProvider: 500,
    sleep: async () => {},
    ...(onRetry ? { onRetry } : {}),
  });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("provider configuration", () => {
  it("builds deployment-configured HTTP providers and an optional fixture", () => {
    const config = loadAutomationConfig({
      JOB_PROVIDER_URLS: "acme|https://jobs.acme.example/api/jobs|data.jobs",
      JOB_PROVIDER_HEADERS: JSON.stringify({
        acme: { Authorization: "Bearer secret-123" },
      }),
    } as Record<string, string>);

    const providers = createProviders(config);
    expect(providers).toHaveLength(1);
    expect(providers[0]?.name).toBe("acme");
  });

  it("builds no providers when nothing is configured", () => {
    const config = loadAutomationConfig({} as Record<string, string>);
    expect(config.providers).toEqual([]);
    expect(createProviders(config)).toEqual([]);
  });

  it("skips malformed provider entries without breaking valid ones", () => {
    const entries = parseProviderUrls("good|https://good.example/jobs, ,,bad|");
    expect(entries.map((entry) => entry.name)).toEqual(["good"]);
  });
});

describe("HttpJsonJobProvider", () => {
  it("accepts a top-level array, a jobs key, and a configured jobsPath", async () => {
    const jobs = [rawJob(), rawJob()];

    const fromArray = new HttpJsonJobProvider({
      name: "arr",
      url: "https://example.test/a",
      fetchImpl: (async () => jsonResponse(jobs)) as typeof fetch,
    });
    expect((await fromArray.fetchJobs()).jobs).toHaveLength(2);

    const fromKey = new HttpJsonJobProvider({
      name: "key",
      url: "https://example.test/b",
      fetchImpl: (async () => jsonResponse({ jobs })) as typeof fetch,
    });
    expect((await fromKey.fetchJobs()).jobs).toHaveLength(2);

    const fromPath = new HttpJsonJobProvider({
      name: "path",
      url: "https://example.test/c",
      jobsPath: "data.jobs",
      fetchImpl: (async () => jsonResponse({ data: { jobs } })) as typeof fetch,
    });
    expect((await fromPath.fetchJobs()).jobs).toHaveLength(2);
  });

  it("treats invalid JSON and missing jobs arrays as transient failures", async () => {
    const badJson = new HttpJsonJobProvider({
      name: "bad-json",
      url: "https://example.test/bad",
      fetchImpl: (async () => jsonResponse("this is not json")) as typeof fetch,
    });
    await expect(badJson.fetchJobs()).rejects.toBeInstanceOf(TransientError);

    const noArray = new HttpJsonJobProvider({
      name: "no-array",
      url: "https://example.test/empty",
      fetchImpl: (async () => jsonResponse({ ok: true })) as typeof fetch,
    });
    await expect(noArray.fetchJobs()).rejects.toBeInstanceOf(TransientError);
  });

  it("maps HTTP 5xx to retryable errors and 4xx to permanent ones", async () => {
    const serverError = new HttpJsonJobProvider({
      name: "srv",
      url: "https://example.test/500",
      fetchImpl: (async () => jsonResponse({ error: "boom" }, 500)) as typeof fetch,
    });
    await expect(serverError.fetchJobs()).rejects.toMatchObject({
      name: "HttpError",
      status: 500,
    } satisfies Partial<HttpError>);

    const notFound = new HttpJsonJobProvider({
      name: "nf",
      url: "https://example.test/404",
      fetchImpl: (async () => jsonResponse({ error: "nope" }, 404)) as typeof fetch,
    });
    await expect(notFound.fetchJobs()).rejects.toMatchObject({ status: 404 });
  });

  it("never includes provider secrets in error messages", async () => {
    const secret = "super-secret-header-value";
    const provider = new HttpJsonJobProvider({
      name: "sec",
      url: "https://example.test/sec",
      headers: { Authorization: `Bearer ${secret}` },
      fetchImpl: (async () => jsonResponse({ error: "x" }, 500)) as typeof fetch,
    });

    const error = await provider.fetchJobs().catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(secret);
    expect((error as Error).message).toContain("sec");
  });
});

describe("fixture provider ingestion", () => {
  it("ingests valid jobs and reports counts", async () => {
    const service = ingestionService();
    const result = await service.runProvider(
      new FixtureJobProvider("fixture", [rawJob(), rawJob()])
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ fetched: 2, created: 2 });
    expect(await prisma.job.count()).toBe(2);
  });

  it("skips malformed records without aborting the batch", async () => {
    const service = ingestionService();
    const result = await service.runProvider(
      new FixtureJobProvider("fixture", [
        rawJob(),
        { company: "No title here", url: "https://example.test/bad" },
        "not-an-object",
        rawJob(),
      ])
    );

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ fetched: 4, created: 2, invalid: 2 });
    expect(await prisma.job.count()).toBe(2);
  });

  it("does not create duplicates for the same provider/externalId", async () => {
    const service = ingestionService();
    const job = rawJob({ externalId: "dup-1" });

    const first = await service.runProvider(new FixtureJobProvider("p", [job]));
    expect(first.summary).toMatchObject({ created: 1 });

    const second = await service.runProvider(
      new FixtureJobProvider("p", [{ ...job }])
    );
    expect(second.summary).toMatchObject({ created: 0 });
    expect(await prisma.job.count()).toBe(1);
  });

  it("treats different externalIds as different jobs", async () => {
    const service = ingestionService();
    const result = await service.runProvider(
      new FixtureJobProvider("p", [
        rawJob({ externalId: "a-1" }),
        rawJob({ externalId: "a-2" }),
      ])
    );

    expect(result.summary).toMatchObject({ created: 2 });
    expect(await prisma.job.count()).toBe(2);
  });

  it("updates the stored row when provider content changes", async () => {
    const service = ingestionService();
    const base = rawJob({ externalId: "chg-1", description: "v1" });

    await service.runProvider(new FixtureJobProvider("p", [base]));

    const updated = await service.runProvider(
      new FixtureJobProvider("p", [{ ...base, description: "v2 improved" }])
    );
    expect(updated.summary).toMatchObject({ created: 0, updated: 1 });

    const stored = await prisma.job.findFirst({
      where: { provider: "p", externalId: "chg-1" },
    });
    expect(stored?.description).toBe("v2 improved");
    expect(await prisma.job.count()).toBe(1);
  });
});

describe("database uniqueness", () => {
  it("rejects a direct duplicate (provider, externalId) insert", async () => {
    const data = {
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
      source: "fixture",
      provider: "p",
      externalId: "uniq-1",
      url: "https://example.test/uniq/1",
    };

    await prisma.job.create({ data });
    await expect(prisma.job.create({ data: { ...data, url: "https://example.test/uniq/2" } })).rejects.toMatchObject({
      code: "P2002",
    });
    expect(await prisma.job.count()).toBe(1);
  });

  it("allows the same externalId from different providers", async () => {
    const base = {
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
      source: "fixture",
      externalId: "shared-1",
    };

    await prisma.job.create({
      data: { ...base, provider: "p1", url: "https://example.test/s/1" },
    });
    await prisma.job.create({
      data: { ...base, provider: "p2", url: "https://example.test/s/2" },
    });
    expect(await prisma.job.count()).toBe(2);
  });

  it("allows multiple provider-less rows", async () => {
    const base = {
      title: "Backend Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote",
      jobType: "Full-time",
      source: "manual",
    };

    await prisma.job.create({ data: { ...base, url: "https://example.test/m/1" } });
    await prisma.job.create({ data: { ...base, url: "https://example.test/m/2" } });
    expect(await prisma.job.count()).toBe(2);
  });
});

describe("normalization", () => {
  it("maps provider-specific aliases and preserves posted dates", () => {
    const result = normalizeRawJob(
      {
        jobTitle: "Data Scientist",
        companyName: "Globex",
        work_mode: "hybrid",
        job_type: "intern",
        link: "https://example.test/n1",
        external_id: "n-1",
        datePosted: "2026-09-01T00:00:00.000Z",
        details: "Analyze data.",
      },
      "partner"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toMatchObject({
      title: "Data Scientist",
      company: "Globex",
      workMode: "Hybrid",
      jobType: "Internship",
      provider: "partner",
      externalId: "n-1",
    });
    expect(result.job.postedAt).toBeInstanceOf(Date);
    expect(result.job.postedAt?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("keeps valid records when the posted date is garbage", () => {
    const result = normalizeRawJob(
      {
        title: "QA Engineer",
        company: "Acme",
        url: "https://example.test/n2",
        postedAt: "not-a-date",
      },
      "p"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.postedAt).toBeUndefined();
  });

  it("persists the posted date through ingestion", async () => {
    const service = ingestionService();
    await service.runProvider(
      new FixtureJobProvider("p", [
        rawJob({ externalId: "pd-1", publishedAt: "2026-08-15T00:00:00.000Z" }),
      ])
    );

    const stored = await prisma.job.findFirst({
      where: { provider: "p", externalId: "pd-1" },
    });
    expect(stored?.postedAt?.toISOString()).toBe("2026-08-15T00:00:00.000Z");
  });
});

describe("retry and failure isolation", () => {
  it("retries transient fetch failures then succeeds", async () => {
    let calls = 0;
    const flaky = {
      name: "flaky",
      fetchJobs: async () => {
        calls += 1;
        if (calls < 3) throw new TransientError("blip");
        return { jobs: [rawJob()] };
      },
    };

    const service = ingestionService();
    const result = await service.runProvider(flaky);

    expect(calls).toBe(3);
    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ created: 1 });
  });

  it("does not retry permanent failures", async () => {
    let calls = 0;
    const broken = {
      name: "broken",
      fetchJobs: async () => {
        calls += 1;
        throw new HttpError(404, "gone");
      },
    };

    const attempts: number[] = [];
    const service = ingestionService((info) => {
      attempts.push(info.attempt);
    });
    const result = await service.runProvider(broken);

    expect(calls).toBe(1);
    expect(attempts).toEqual([]);
    expect(result.ok).toBe(false);
  });

  it("isolates a failing provider from healthy ones", async () => {
    const failing = {
      name: "failing",
      fetchJobs: async (): Promise<{ jobs: unknown[] }> => {
        throw new TransientError("down");
      },
    };

    const service = ingestionService();
    const results = await service.runAll([
      failing,
      new FixtureJobProvider("healthy", [rawJob()]),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ provider: "failing", ok: false });
    expect(results[1]).toMatchObject({ provider: "healthy", ok: true });
    expect(await prisma.job.count()).toBe(1);
  });
});

describe("expiration handling", () => {
  it("expires stale active jobs and keeps fresh ones", async () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    await prisma.job.create({
      data: {
        title: "Stale Role",
        company: "Acme",
        location: "Remote",
        workMode: "Remote",
        jobType: "Full-time",
        source: "fixture",
        url: "https://example.test/stale/1",
        status: "ACTIVE",
        lastSeenAt: old,
      },
    });
    await prisma.job.create({
      data: {
        title: "Fresh Role",
        company: "Acme",
        location: "Remote",
        workMode: "Remote",
        jobType: "Full-time",
        source: "fixture",
        url: "https://example.test/fresh/1",
        status: "ACTIVE",
        lastSeenAt: new Date(),
      },
    });

    const service = new ExpirationService();
    const result = await service.expireStale(30 * 24 * 60 * 60 * 1000);

    expect(result).toMatchObject({ candidates: 1, expired: 1 });

    const stale = await prisma.job.findFirst({
      where: { url: "https://example.test/stale/1" },
    });
    const fresh = await prisma.job.findFirst({
      where: { url: "https://example.test/fresh/1" },
    });
    expect(stale?.status).toBe("EXPIRED");
    expect(fresh?.status).toBe("ACTIVE");
    // Expired rows are retained, never deleted.
    expect(await prisma.job.count()).toBe(2);
  });
});
