import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma.js";
import {
  notificationRepository,
  type ListNotificationOptions,
} from "../repositories/notifications.repository.js";

export type NotificationType =
  | "NEW_JOB"
  | "JOB_UPDATED"
  | "JOB_EXPIRED"
  | "APPLICATION_UPDATE";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
}

interface NotifiableJob {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  jobType: string;
  description?: string | null;
}

interface MatchablePreferences {
  jobRole: string | null;
  location: string | null;
  workMode: string | null;
  jobType: string | null;
}

/**
 * Preferences are best-effort filters: an unset field matches everything, and a
 * missing preferences/settings row is treated as "alerts enabled" so existing
 * users keep receiving alerts after the automation layer ships.
 */
export function jobMatchesPreferences(
  job: Pick<NotifiableJob, "title" | "company" | "description" | "location" | "workMode" | "jobType">,
  preferences: MatchablePreferences | null | undefined
): boolean {
  if (!preferences) return true;

  const haystack = `${job.title} ${job.company} ${job.description ?? ""}`.toLowerCase();

  if (preferences.jobRole) {
    const role = preferences.jobRole.toLowerCase().trim();
    const tokens = role.split(/\s+/).filter((token) => token.length >= 3);
    const matchesRole =
      haystack.includes(role) || tokens.some((token) => haystack.includes(token));
    if (!matchesRole) return false;
  }

  if (preferences.location) {
    const location = preferences.location.toLowerCase().trim();
    const jobLocation = job.location.toLowerCase();
    if (jobLocation !== "not specified" && !jobLocation.includes(location)) {
      return false;
    }
  }

  if (preferences.workMode && preferences.workMode !== job.workMode) {
    return false;
  }

  if (preferences.jobType && preferences.jobType !== job.jobType) {
    return false;
  }

  return true;
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Prisma.JsonValue;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

function toView(notification: {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  return {
    id: notification.id,
    type: notification.type as NotificationType,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    read: notification.readAt !== null,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

export class NotificationService {
  async listForUser(userId: string, options: ListNotificationOptions = {}) {
    const { items, unread } = await notificationRepository.listForUser(
      userId,
      options
    );
    return { notifications: items.map(toView), unread };
  }

  async markRead(userId: string, id: string) {
    const updated = await notificationRepository.markRead(userId, id);
    if (updated === 0) {
      const check = await notificationRepository.listForUser(userId, {
        limit: 1,
      });
      const exists = check.items.some((item) => item.id === id);
      if (!exists) {
        throw new Error("Notification not found");
      }
    }
    return { id, read: true };
  }

  async markAllRead(userId: string) {
    const updated = await notificationRepository.markAllRead(userId);
    return { updated };
  }

  async deleteAll(userId: string) {
    const deleted = await notificationRepository.deleteAllForUser(userId);
    return { deleted };
  }

  async create(input: CreateNotificationInput) {
    return notificationRepository.create({
      user: { connect: { id: input.userId } },
      type: input.type,
      title: input.title,
      message: input.message,
      ...(input.data === undefined ? {} : { data: input.data }),
    });
  }

  /**
   * NEW_JOB alerts for freshly ingested jobs, filtered by each user's job
   * preferences. Returns the number of notifications created.
   *
   * Three Settings toggles are honoured here, all of them opt-out so a user who
   * has never opened Settings keeps receiving alerts:
   *   - `emailNotifications` (master): turns the notification channel off.
   *   - `autoMatch` (AI): stops newly aggregated jobs being matched against the
   *     user's profile, so there is nothing left to alert about.
   *   - `jobAlerts`: the NEW_JOB category itself.
   */
  async notifyNewJobs(
    jobs: NotifiableJob[],
    options: { excludeUserIds?: Set<string> } = {}
  ): Promise<number> {
    if (jobs.length === 0) return 0;

    const candidates = await notificationRepository.findAlertCandidates();
    const rows: Prisma.NotificationCreateManyInput[] = [];

    for (const candidate of candidates) {
      if (candidate.settings?.emailNotifications === false) continue;
      if (candidate.settings?.autoMatch === false) continue;
      if (candidate.settings?.jobAlerts === false) continue;
      if (options.excludeUserIds?.has(candidate.id)) continue;

      const matching = jobs.filter((job) =>
        jobMatchesPreferences(job, candidate.preferences)
      );
      if (matching.length === 0) continue;

      const label =
        matching.length === 1
          ? `"${matching[0]!.title}" at ${matching[0]!.company}`
          : `${matching.length} new jobs matching your preferences`;

      rows.push({
        userId: candidate.id,
        type: "NEW_JOB",
        title: matching.length === 1 ? "New job match" : "New job matches",
        message: label,
        data: { jobIds: matching.map((job) => job.id) } as Prisma.InputJsonValue,
      });
    }

    const result = await notificationRepository.createMany(rows);
    return result.count;
  }

  /** JOB_UPDATED alerts for people who bookmarked a changed job. */
  async notifyJobUpdated(
    job: Pick<NotifiableJob, "id" | "title" | "company">
  ): Promise<number> {
    const userIds = await notificationRepository.findBookmarkerIds(job.id);
    if (userIds.length === 0) return 0;

    const result = await notificationRepository.createMany(
      userIds.map((userId) => ({
        userId,
        type: "JOB_UPDATED" as const,
        title: "Saved job updated",
        message: `"${job.title}" at ${job.company} has been updated`,
        data: { jobId: job.id } as Prisma.InputJsonValue,
      }))
    );
    return result.count;
  }

  /** JOB_EXPIRED alerts for bookmarks on jobs that dropped out of the feed. */
  async notifyJobExpired(
    jobs: Array<Pick<NotifiableJob, "id" | "title" | "company">>
  ): Promise<number> {
    if (jobs.length === 0) return 0;

    const rows: Prisma.NotificationCreateManyInput[] = [];
    for (const job of jobs) {
      const userIds = await notificationRepository.findBookmarkerIds(job.id);
      for (const userId of userIds) {
        rows.push({
          userId,
          type: "JOB_EXPIRED",
          title: "Saved job expired",
          message: `"${job.title}" at ${job.company} is no longer listed`,
          data: { jobId: job.id } as Prisma.InputJsonValue,
        });
      }
    }

    const result = await notificationRepository.createMany(rows);
    return result.count;
  }

  /**
   * APPLICATION_UPDATE alerts.
   *
   * Respects three Settings toggles, all opt-out so an untouched account keeps
   * the alerts it had before:
   *   - `emailNotifications` (master): the notification channel itself.
   *   - `applicationUpdates`: status changes in general.
   *   - `interviewReminders`: additionally gates the interview stage, so a user
   *     who does not want interview alerts can turn them off without losing the
   *     rest of their application tracking.
   */
  async notifyApplicationUpdate(
    userId: string,
    job: Pick<NotifiableJob, "id" | "title" | "company">,
    status: string
  ): Promise<boolean> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    if (settings?.emailNotifications === false) return false;
    if (settings?.applicationUpdates === false) return false;
    if (
      status === "Interview" &&
      settings?.interviewReminders === false
    ) {
      return false;
    }

    await this.create({
      userId,
      type: "APPLICATION_UPDATE",
      title: "Application update",
      message: `Your application for "${job.title}" at ${job.company} is now ${status}`,
      data: { jobId: job.id, status },
    });
    return true;
  }
}

export const notificationService = new NotificationService();
