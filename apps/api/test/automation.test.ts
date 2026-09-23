/**
 * Phase 3 — automation layer.
 *
 * Covers normalization/validation, dedup, the aggregation pipeline, retries,
 * scheduling, expiration, notifications matching and optional AI enrichment.
 * Integration cases run against the isolated `_test` database through the same
 * repositories/services the worker uses.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma, resetDatabase, disconnectDatabase } from "./helpers/db.js";
import { createUser } from "./helpers/auth.js";
import app from "../src/app.js";
import { jobRepository } from "../src/repositories/jobs.repository.js";

import {
  AutomationAggregationService,
  AiEnrichmentService,
  NotificationCleanupService,
  AutomationScheduler,
  ExpirationService,
  FixtureJobProvider,
  HttpError,
  IngestionService,
  PermanentError,
  createAutomationRuntime,
  computeContentHash,
  loadAutomationConfig,
  normalizeRawJob,
  normalizeUrl,
  parseProviderUrls,
  withRetry,
  backoffDelay,
  type JobProvider,
} from "../src/automation/index.js";

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
    url: `https://example.test/jobs/${unique}`,
    externalId: `ext-${unique}`,
    ...overrides,
  };
}

async function seedUser(overrides: {
  jobRole?: string | null;
  location?: string | null;
  workMode?: string | null;
  jobType?: string | null;
  jobAlerts?: boolean;
} = {}) {
  const user = await createUser(app);
  if (
    overrides.jobRole ||
    overrides.location ||
    overrides.workMode ||
    overrides.jobType
  ) {
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        jobRole: overrides.jobRole ?? null,
        location: overrides.location ?? null,
        workMode: overrides.workMode ?? null,
        jobType: overrides.jobType ?? null,
      },
    });
  }
  if (overrides.jobAlerts !== undefined) {
    await prisma.userSettings.create({
      data: { userId: user.id, jobAlerts: overrides.jobAlerts },
    });
  }
  return user;
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe("normalizeRawJob", () => {
  it("maps provider aliases and defaults missing enums", () => {
    const result = normalizeRawJob(
      {
        jobTitle: "Data Scientist",
        companyName: "Globex",
        work_mode: "hybrid",
        job_type: "intern",
        link: "https://example.test/a",
      },
      "test"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job).toMatchObject({
      title: "Data Scientist",
      company: "Globex",
      workMode: "Hybrid",
      jobType: "Internship",
      location: "Not specified",
      provider: "test",
    });
  });

  it("rejects records without a title or company", () => {
    expect(normalizeRawJob({ company: "Acme" }, "test").ok).toBe(false);
    expect(normalizeRawJob({ title: "Engineer" }, "test").ok).toBe(false);
  });

  it("rejects non-object records", () => {
    const result = normalizeRawJob("nope", "test");
    expect(result.ok).toBe(false);
  });

  it("synthesizes a deterministic url from an external id", () => {
    const first = normalizeRawJob(
      { title: "Engineer", company: "Acme", externalId: "abc-1" },
      "test"
    );
    const second = normalizeRawJob(
      { title: "Engineer", company: "Acme", externalId: "abc-1" },
      "test"
    );

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.job.url).toBe(second.job.url);
    expect(first.job.url).toContain("abc-1");
  });

  it("produces a stable content hash independent of field order", () => {
    const base = {
      title: "Engineer",
      company: "Acme",
      location: "Remote",
      workMode: "Remote" as const,
      jobType: "Full-time" as const,
      url: "https://example.test/1",
      source: "test",
      provider: "test",
      externalId: "1",
    };

    expect(computeContentHash(base)).toBe(computeContentHash({ ...base }));
    expect(computeContentHash(base)).not.toBe(
      computeContentHash({ ...base, salary: "$1" })
    );
  });
});

describe("normalizeUrl", () => {
  it("strips tracking params, hash and trailing slash", () => {
    expect(
      normalizeUrl("HTTPS://Example.test/jobs/1/?utm_source=x#section")
    ).toBe("https://example.test/jobs/1");
  });

  it("returns null for invalid urls", () => {
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("withRetry", () => {
  const noSleep = async () => {};

  it("retries transient failures and eventually succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new HttpError(503, "unavailable");
        return "ok";
      },
      { attempts: 3, sleep: noSleep }
    );

    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry permanent failures", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new HttpError(400, "bad request");
        },
        { attempts: 3, sleep: noSleep }
      )
    ).rejects.toThrow("bad request");
    expect(calls).toBe(1);
  });

  it("stops after the configured number of attempts", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new PermanentError("always");
        },
        { attempts: 2, isRetryable: () => true, sleep: noSleep }
      )
    ).rejects.toThrow("always");
    expect(calls).toBe(2);
  });

  it("caps exponential backoff", () => {
    expect(backoffDelay(1, 100, 1000)).toBe(100);
    expect(backoffDelay(10, 100, 1000)).toBe(1000);
  });
});

describe("aggregation pipeline", () => {
  it("creates jobs, skips duplicates and reports invalid records", async () => {
    const service = new AutomationAggregationService();
    const raw = [
      rawJob({ url: "https://example.test/dupe" }),
      rawJob({ url: "https://example.test/dupe" }),
      { title: "" },
      rawJob(),
    ];

    const summary = await service.ingest(raw, "provider-a");

    expect(summary.fetched).toBe(4);
    expect(summary.created).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.invalid).toBe(1);
    expect(summary.errors[0]?.index).toBe(2);
    expect(await prisma.job.count()).toBe(2);
  });

  it("skips unchanged jobs on re-ingest and updates lastSeenAt", async () => {
    const service = new AutomationAggregationService();
    const job = rawJob();

    const first = await service.ingest([job], "provider-a");
    const stored = await prisma.job.findFirstOrThrow();
    expect(first.created).toBe(1);

    const second = await service.ingest([job], "provider-a");
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(1);

    const after = await prisma.job.findUniqueOrThrow({
      where: { id: stored.id },
    });
    expect(after.contentHash).toBe(stored.contentHash);
  });

  it("updates a job when content changes and notifies bookmarkers", async () => {
    const service = new AutomationAggregationService();
    const job = rawJob();
    const first = await service.ingest([job], "provider-a");
    expect(first.created).toBe(1);

    const stored = await prisma.job.findFirstOrThrow();
    const user = await seedUser();
    await prisma.bookmark.create({
      data: { userId: user.id, jobId: stored.id },
    });

    const summary = await service.ingest(
      [{ ...job, salary: "$150k" }],
      "provider-a"
    );

    expect(summary.updated).toBe(1);
    expect(summary.notificationsCreated).toBe(1);

    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(notification.type).toBe("JOB_UPDATED");
  });

  it("reactivates a previously expired job", async () => {
    const service = new AutomationAggregationService();
    const job = rawJob();
    await service.ingest([job], "provider-a");

    const stored = await prisma.job.findFirstOrThrow();
    await prisma.job.update({
      where: { id: stored.id },
      data: { status: "EXPIRED", expiredAt: new Date() },
    });

    const summary = await service.ingest([job], "provider-a");
    const reactivated = await prisma.job.findUniqueOrThrow({
      where: { id: stored.id },
    });

    expect(summary.updated).toBe(1);
    expect(reactivated.status).toBe("ACTIVE");
    expect(reactivated.expiredAt).toBeNull();
  });
});

describe("ingestion service", () => {
  it("isolates a failing provider and continues with the rest", async () => {
    const service = new AutomationAggregationService();
    const failing: JobProvider = {
      name: "broken",
      fetchJobs: async () => {
        throw new HttpError(500, "boom");
      },
    };
    const working = new FixtureJobProvider("working", [rawJob()]);

    const ingestion = new IngestionService(service, {
      maxAttempts: 2,
      baseBackoffMs: 1,
      maxBackoffMs: 1,
      maxJobsPerProvider: 10,
      sleep: async () => {},
    });

    const results = await ingestion.runAll([failing, working]);

    expect(results[0]!.ok).toBe(false);
    expect(results[1]!.ok).toBe(true);
    expect(await prisma.job.count()).toBe(1);
  });
});

describe("expiration", () => {
  it("marks stale jobs expired without deleting them", async () => {
    const service = new AutomationAggregationService();
    await service.ingest([rawJob()], "provider-a");

    const stored = await prisma.job.findFirstOrThrow();
    await prisma.job.update({
      where: { id: stored.id },
      data: { lastSeenAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    });

    const expiration = new ExpirationService();
    const result = await expiration.expireStale(7 * 24 * 60 * 60 * 1000);

    expect(result.expired).toBe(1);
    const after = await prisma.job.findUniqueOrThrow({
      where: { id: stored.id },
    });
    expect(after.status).toBe("EXPIRED");
    expect(after.expiredAt).not.toBeNull();
  });

  it("excludes expired jobs from the default catalogue listing", async () => {
    const service = new AutomationAggregationService();
    await service.ingest([rawJob()], "provider-a");
    const stored = await prisma.job.findFirstOrThrow();
    await prisma.job.update({
      where: { id: stored.id },
      data: { status: "EXPIRED" },
    });

    expect(await jobRepository.findAll()).toHaveLength(0);
    expect(await jobRepository.findAll({ includeExpired: true })).toHaveLength(
      1
    );
  });

  it("notifies bookmarkers with a JOB_EXPIRED alert", async () => {
    const service = new AutomationAggregationService();
    await service.ingest([rawJob()], "provider-a");
    const stored = await prisma.job.findFirstOrThrow();

    const user = await seedUser();
    await prisma.bookmark.create({
      data: { userId: user.id, jobId: stored.id },
    });
    await prisma.job.update({
      where: { id: stored.id },
      data: { lastSeenAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    });

    const expiration = new ExpirationService();
    const result = await expiration.expireStale(7 * 24 * 60 * 60 * 1000);

    expect(result.notificationsCreated).toBe(1);
    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(notification.type).toBe("JOB_EXPIRED");
  });
});

describe("notification matching", () => {
  it("alerts users whose preferences match a new job", async () => {
    const matching = await seedUser({ jobRole: "Backend Engineer" });
    const nonMatching = await seedUser({ jobRole: "Graphic Designer" });

    const service = new AutomationAggregationService();
    const summary = await service.ingest([rawJob()], "provider-a");

    expect(summary.notificationsCreated).toBe(1);

    const matchingAlerts = await prisma.notification.findMany({
      where: { userId: matching.id },
    });
    const otherAlerts = await prisma.notification.findMany({
      where: { userId: nonMatching.id },
    });

    expect(matchingAlerts).toHaveLength(1);
    expect(matchingAlerts[0]!.type).toBe("NEW_JOB");
    expect(otherAlerts).toHaveLength(0);
  });

  it("does not alert users who disabled job alerts", async () => {
    await seedUser({ jobRole: "Backend Engineer", jobAlerts: false });

    const service = new AutomationAggregationService();
    const summary = await service.ingest([rawJob()], "provider-a");

    expect(summary.notificationsCreated).toBe(0);
    expect(await prisma.notification.count()).toBe(0);
  });
});

describe("AI enrichment", () => {
  it("does nothing when disabled", async () => {
    const summarize = vi.fn();
    const service = new AiEnrichmentService({ summarize });

    const result = await service.enrich(5, false);

    expect(result.enabled).toBe(false);
    expect(result.enriched).toBe(0);
    expect(summarize).not.toHaveBeenCalled();
  });

  it("stores enrichment for active jobs without failing the run", async () => {
    const service = new AutomationAggregationService();
    await service.ingest([rawJob()], "provider-a");

    const summarize = vi
      .fn()
      .mockResolvedValueOnce({ summary: "Great role" })
      .mockRejectedValueOnce(new Error("ai down"));
    await service.ingest([rawJob({ title: "Frontend Engineer" })], "provider-a");

    const enrichment = new AiEnrichmentService({ summarize });
    const result = await enrichment.enrich(10, true);

    expect(result.enabled).toBe(true);
    expect(result.enriched).toBe(1);
    expect(result.failed).toBe(1);

    const enriched = await prisma.job.findFirst({
      where: { enrichedAt: { not: null } },
    });
    expect(enriched).not.toBeNull();
  });
});

describe("scheduler", () => {
  it("runs a task by name and rejects unknown tasks", async () => {
    const run = vi.fn().mockResolvedValue("done");
    const scheduler = new AutomationScheduler([
      { name: "task", intervalMs: 1000, run },
    ]);

    await expect(scheduler.runOnce("task")).resolves.toBe("done");
    expect(run).toHaveBeenCalledTimes(1);
    await expect(scheduler.runOnce("missing")).rejects.toThrow(
      "Unknown automation task"
    );
  });

  it("skips overlapping runs of the same task", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const run = vi.fn().mockImplementation(async () => {
      await gate;
    });

    const scheduler = new AutomationScheduler([
      { name: "task", intervalMs: 1000, run },
    ]);

    const first = scheduler.runOnce("task");
    const second = await scheduler.runOnce("task");

    expect(second).toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
    release();
    await first;
  });

  it("toggles its running state", () => {
    const scheduler = new AutomationScheduler([
      { name: "task", intervalMs: 1000, run: async () => undefined },
    ]);

    expect(scheduler.isRunning).toBe(false);
    scheduler.start();
    expect(scheduler.isRunning).toBe(true);
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
  });
});

describe("runtime + config", () => {
  it("parses provider urls from configuration", () => {
    const providers = parseProviderUrls(
      "linkedin|https://example.test/linkedin, wellfound |https://example.test/wf",
      { linkedin: { Authorization: "Bearer token" } }
    );

    expect(providers).toHaveLength(2);
    expect(providers[0]).toMatchObject({
      name: "linkedin",
      url: "https://example.test/linkedin",
      headers: { Authorization: "Bearer token" },
    });
  });

  it("loads defaults with an empty environment", () => {
    const config = loadAutomationConfig({});
    expect(config.enabled).toBe(true);
    expect(config.aiEnrichment.enabled).toBe(false);
    expect(config.maxAttempts).toBe(3);
    expect(config.notificationCleanup.intervalMs).toBe(6 * 60 * 60 * 1000);
    expect(config.notificationCleanup.ttlMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("runs the fixture provider end to end", async () => {
    const config = loadAutomationConfig({});
    const runtime = createAutomationRuntime(config, {
      providers: [new FixtureJobProvider("fixture", [rawJob()])],
    });

    await runtime.runOnce("job-fetch");

    expect(await prisma.job.count()).toBe(1);
    await expect(runtime.runOnce("notification-cleanup")).resolves.toMatchObject({
      deleted: expect.any(Number),
    });
    runtime.stop();
  });
});

describe("notification cleanup", () => {
  it("deletes read notifications older than the TTL", async () => {
    const user = await seedUser();
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "NEW_JOB",
        title: "Old read",
        message: "Old read notification",
        readAt: oldDate,
        createdAt: oldDate,
      },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "NEW_JOB",
        title: "Recent read",
        message: "Recent read notification",
        readAt: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "NEW_JOB",
        title: "Old unread",
        message: "Old unread notification",
      },
    });

    const cleanup = new NotificationCleanupService();
    const result = await cleanup.cleanup(7 * 24 * 60 * 60 * 1000);

    expect(result.deleted).toBe(1);
    expect(await prisma.notification.count()).toBe(2);
  });

  it("does not delete unread notifications regardless of age", async () => {
    const user = await seedUser();
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "NEW_JOB",
        title: "Very old unread",
        message: "Should survive",
        createdAt: oldDate,
      },
    });

    const cleanup = new NotificationCleanupService();
    const result = await cleanup.cleanup(30 * 24 * 60 * 60 * 1000);

    expect(result.deleted).toBe(0);
    expect(await prisma.notification.count()).toBe(1);
  });

  it("reports zero when nothing to clean", async () => {
    const cleanup = new NotificationCleanupService();
    const result = await cleanup.cleanup(24 * 60 * 60 * 1000);
    expect(result.deleted).toBe(0);
  });
});
