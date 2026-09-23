/**
 * Expiration: jobs that stop appearing in a provider feed are marked EXPIRED
 * (never deleted, so bookmarks, applications and details remain intact) and the
 * users who bookmarked them receive a JOB_EXPIRED notification.
 */
import type { Job } from "@prisma/client";

import { jobRepository } from "../repositories/jobs.repository.js";
import { notificationService } from "../services/notifications.service.js";
import type { AggregationLogger } from "./aggregation.service.js";

export interface ExpirationJobsRepo {
  findStaleActiveJobs: (cutoff: Date) => Promise<Job[]>;
  markExpired: (ids: string[], expiredAt: Date) => Promise<{ count: number }>;
}

export interface ExpirationNotifications {
  notifyJobExpired: (
    jobs: Array<Pick<Job, "id" | "title" | "company">>
  ) => Promise<number>;
}

export interface ExpirationDeps {
  jobs?: ExpirationJobsRepo;
  notifications?: ExpirationNotifications;
  logger?: AggregationLogger;
  now?: () => Date;
}

export interface ExpirationResult {
  candidates: number;
  expired: number;
  notificationsCreated: number;
}

const silentLogger: AggregationLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export class ExpirationService {
  private readonly jobs: ExpirationJobsRepo;
  private readonly notifications: ExpirationNotifications;
  private readonly logger: AggregationLogger;
  private readonly now: () => Date;

  constructor(deps: ExpirationDeps = {}) {
    this.jobs = deps.jobs ?? jobRepository;
    this.notifications = deps.notifications ?? notificationService;
    this.logger = deps.logger ?? silentLogger;
    this.now = deps.now ?? (() => new Date());
  }

  async expireStale(ttlMs: number): Promise<ExpirationResult> {
    const now = this.now();
    const cutoff = new Date(now.getTime() - ttlMs);
    const stale = await this.jobs.findStaleActiveJobs(cutoff);

    if (stale.length === 0) {
      return { candidates: 0, expired: 0, notificationsCreated: 0 };
    }

    const result = await this.jobs.markExpired(
      stale.map((job) => job.id),
      now
    );

    let notificationsCreated = 0;
    try {
      notificationsCreated = await this.notifications.notifyJobExpired(stale);
    } catch (error) {
      this.logger.warn("Failed to create job expired alerts", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.logger.info("Expiration run completed", {
      candidates: stale.length,
      expired: result.count,
      notificationsCreated,
    });

    return {
      candidates: stale.length,
      expired: result.count,
      notificationsCreated,
    };
  }
}
