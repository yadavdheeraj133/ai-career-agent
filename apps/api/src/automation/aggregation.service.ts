/**
 * Core aggregation pipeline:
 *   provided raw records -> normalize/validate -> dedupe -> store/update.
 *
 * The pipeline is deliberately push-agnostic: the scheduled worker feeds it
 * from a provider, and the existing `POST /api/jobs/aggregate` endpoint feeds it
 * from an HTTP caller. A single malformed record is skipped and reported rather
 * than aborting the batch.
 */
import type { Job, Prisma } from "@prisma/client";

import { jobRepository } from "../repositories/jobs.repository.js";
import { notificationService } from "../services/notifications.service.js";
import { identityKey, normalizeRawJob } from "./normalize.js";
import type { IngestSummary, InvalidJob, NormalizedJob } from "./types.js";

export interface AggregationLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface AggregationJobsRepo {
  findByUrl: (url: string) => Promise<Job | null>;
  findByExternalId: (provider: string, externalId: string) => Promise<Job | null>;
  createFromProvider: (data: Prisma.JobUncheckedCreateInput) => Promise<Job>;
  update: (id: string, data: Prisma.JobUpdateInput) => Promise<Job>;
}

export interface AggregationNotifications {
  notifyNewJobs: (jobs: Job[]) => Promise<number>;
  notifyJobUpdated: (job: Job) => Promise<number>;
}

export interface AggregationDeps {
  jobs?: AggregationJobsRepo;
  notifications?: AggregationNotifications;
  logger?: AggregationLogger;
}

const silentLogger: AggregationLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function toJobPayload(job: NormalizedJob): Prisma.JobUncheckedCreateInput {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    workMode: job.workMode,
    jobType: job.jobType,
    experience: job.experience ?? null,
    salary: job.salary ?? null,
    description: job.description ?? null,
    source: job.source,
    provider: job.provider,
    externalId: job.externalId,
    contentHash: job.contentHash,
    status: "ACTIVE",
    lastSeenAt: new Date(),
    url: job.url,
  };
}

export class AutomationAggregationService {
  private readonly jobs: AggregationJobsRepo;
  private readonly notifications: AggregationNotifications;
  private readonly logger: AggregationLogger;

  constructor(deps: AggregationDeps = {}) {
    this.jobs = deps.jobs ?? jobRepository;
    this.notifications = deps.notifications ?? notificationService;
    this.logger = deps.logger ?? silentLogger;
  }

  async ingest(rawJobs: unknown[], provider: string): Promise<IngestSummary> {
    const summary: IngestSummary = {
      provider,
      fetched: rawJobs.length,
      created: 0,
      updated: 0,
      skipped: 0,
      invalid: 0,
      notificationsCreated: 0,
      jobs: [],
      errors: [],
    };

    const seenInBatch = new Set<string>();
    const createdJobs: Job[] = [];
    const updatedJobs: Job[] = [];

    for (let index = 0; index < rawJobs.length; index += 1) {
      const result = normalizeRawJob(rawJobs[index], provider);
      if (!result.ok) {
        summary.invalid += 1;
        summary.errors.push(this.invalid(index, result.reason, rawJobs[index]));
        continue;
      }

      const job = result.job;
      const key = identityKey(job);
      if (seenInBatch.has(key)) {
        summary.skipped += 1;
        continue;
      }
      seenInBatch.add(key);

      try {
        const existing = await this.findExisting(job);

        if (!existing) {
          const created = await this.jobs.createFromProvider(toJobPayload(job));
          createdJobs.push(created);
          summary.created += 1;
          summary.jobs.push(job);
          continue;
        }

        const wasExpired = existing.status === "EXPIRED";
        if (existing.contentHash === job.contentHash && !wasExpired) {
          await this.jobs.update(existing.id, { lastSeenAt: new Date() });
          summary.skipped += 1;
          continue;
        }

        const updated = await this.jobs.update(existing.id, {
          ...toJobPayload(job),
          ...(wasExpired ? { status: "ACTIVE", expiredAt: null } : {}),
        });
        updatedJobs.push(updated);
        summary.updated += 1;
        summary.jobs.push(job);
      } catch (error) {
        summary.invalid += 1;
        summary.errors.push(
          this.invalid(
            index,
            error instanceof Error ? error.message : String(error),
            rawJobs[index]
          )
        );
      }
    }

    summary.notificationsCreated += await this.safeNotify(
      () => this.notifications.notifyNewJobs(createdJobs),
      "new job alerts"
    );

    for (const job of updatedJobs) {
      summary.notificationsCreated += await this.safeNotify(
        () => this.notifications.notifyJobUpdated(job),
        "job update alerts"
      );
    }

    this.logger.info("Aggregation completed", {
      provider,
      fetched: summary.fetched,
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      invalid: summary.invalid,
    });

    return summary;
  }

  private async findExisting(job: NormalizedJob): Promise<Job | null> {
    if (job.provider && job.externalId) {
      const byExternalId = await this.jobs.findByExternalId(
        job.provider,
        job.externalId
      );
      if (byExternalId) return byExternalId;
    }
    return this.jobs.findByUrl(job.url);
  }

  private invalid(index: number, reason: string, raw: unknown): InvalidJob {
    this.logger.warn("Skipped invalid job record", { index, reason });
    return { index, reason, raw };
  }

  private async safeNotify(
    operation: () => Promise<number>,
    label: string
  ): Promise<number> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(`Failed to create ${label}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}

export const automationAggregationService = new AutomationAggregationService();
