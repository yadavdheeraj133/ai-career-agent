/**
 * Notification cleanup: deletes read notifications older than a configurable
 * TTL to prevent indefinite accumulation. Unread notifications are never
 * touched so users don't miss alerts.
 */
import { notificationRepository } from "../repositories/notifications.repository.js";
import type { AggregationLogger } from "./aggregation.service.js";

export interface CleanupNotificationsRepo {
  deleteOldRead: (olderThan: Date) => Promise<number>;
}

export interface NotificationCleanupDeps {
  notifications?: CleanupNotificationsRepo;
  logger?: AggregationLogger;
  now?: () => Date;
}

export interface NotificationCleanupResult {
  candidates: number;
  deleted: number;
}

const silentLogger: AggregationLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export class NotificationCleanupService {
  private readonly notifications: CleanupNotificationsRepo;
  private readonly logger: AggregationLogger;
  private readonly now: () => Date;

  constructor(deps: NotificationCleanupDeps = {}) {
    this.notifications = deps.notifications ?? notificationRepository;
    this.logger = deps.logger ?? silentLogger;
    this.now = deps.now ?? (() => new Date());
  }

  async cleanup(ttlMs: number): Promise<NotificationCleanupResult> {
    const cutoff = new Date(this.now().getTime() - ttlMs);

    let deleted: number;
    try {
      deleted = await this.notifications.deleteOldRead(cutoff);
    } catch (error) {
      this.logger.warn("Failed to clean up old notifications", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { candidates: 0, deleted: 0 };
    }

    this.logger.info("Notification cleanup completed", { deleted });

    return { candidates: deleted, deleted };
  }
}
