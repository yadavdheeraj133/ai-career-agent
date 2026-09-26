import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma.js";

export interface ListNotificationOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export class NotificationRepository {
  async create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({ data });
  }

  async createMany(data: Prisma.NotificationCreateManyInput[]) {
    if (data.length === 0) return { count: 0 };
    return prisma.notification.createMany({ data });
  }

  async listForUser(userId: string, options: ListNotificationOptions = {}) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(options.unreadOnly ? { readAt: null } : {}),
    };

    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit ?? 50,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items, unread };
  }

  async markRead(userId: string, id: string) {
    const result = await prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  /** Users who bookmarked a job — used for saved-job change alerts. */
  async findBookmarkerIds(jobId: string) {
    const bookmarks = await prisma.bookmark.findMany({
      where: { jobId },
      select: { userId: true },
    });
    return bookmarks.map((bookmark) => bookmark.userId);
  }

  async deleteOldRead(olderThan: Date) {
    const result = await prisma.notification.deleteMany({
      where: { readAt: { not: null, lt: olderThan } },
    });
    return result.count;
  }

  async findAlertCandidates() {
    return prisma.user.findMany({
      select: {
        id: true,
        preferences: true,
        settings: {
          select: {
            // Master channel switch, the NEW_JOB category toggle, and the AI
            // auto-match toggle that decides whether new jobs are matched
            // against this user's profile at all.
            emailNotifications: true,
            jobAlerts: true,
            applicationUpdates: true,
            autoMatch: true,
          },
        },
      },
    });
  }
}

export const notificationRepository = new NotificationRepository();
