import { prisma } from "../lib/prisma.js";

function countSkills(skills: unknown): number {
  return Array.isArray(skills) ? skills.length : 0;
}

export class DashboardService {
  async getSummary(userId: string) {
    const [profile, resume, totalJobs, bookmarks, applications, preferences, settings] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        }),
        prisma.resume.findUnique({
          where: { userId },
        }),
        prisma.job.count(),
        prisma.bookmark.count({ where: { userId } }),
        prisma.jobApplication.findMany({
          where: { userId },
          select: { status: true },
        }),
        prisma.userPreferences.findUnique({
          where: { userId },
        }),
        prisma.userSettings.findUnique({
          where: { userId },
        }),
      ]);

    if (!profile) {
      throw new Error("User not found");
    }

    const applicationsByStatus: Record<string, number> = {};
    for (const application of applications) {
      applicationsByStatus[application.status] =
        (applicationsByStatus[application.status] ?? 0) + 1;
    }

    return {
      profile,
      resume: {
        exists: resume !== null,
        title: resume?.title ?? null,
        skillsCount: countSkills(resume?.skills),
        updatedAt: resume?.updatedAt?.toISOString() ?? null,
      },
      jobs: {
        total: totalJobs,
        saved: bookmarks,
      },
      applications: {
        total: applications.length,
        byStatus: applicationsByStatus,
      },
      preferences: {
        exists: preferences !== null,
      },
      settings: {
        exists: settings !== null,
      },
    };
  }
}

export const dashboardService = new DashboardService();
