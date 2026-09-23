import { jobRepository } from "../repositories/jobs.repository.js";
import { prisma } from "../lib/prisma.js";

export class JobBookmarkService {
  async bookmarkJob(userId: string, jobId: string) {
    const job = await jobRepository.findById(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    await prisma.bookmark.upsert({
      where: {
        userId_jobId: { userId, jobId: job.id },
      },
      create: { userId, jobId: job.id },
      update: {},
    });

    return {
      jobId: job.id,
      bookmarked: true,
    };
  }

  async removeBookmark(userId: string, jobId: string) {
    const job = await jobRepository.findById(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    await prisma.bookmark.deleteMany({
      where: { userId, jobId: job.id },
    });

    return {
      jobId: job.id,
      bookmarked: false,
    };
  }

  async listBookmarks(userId: string) {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: { job: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      count: bookmarks.length,
      data: bookmarks.map((bookmark) => ({
        jobId: bookmark.jobId,
        bookmarked: true,
        bookmarkedAt: bookmark.createdAt.toISOString(),
        job: bookmark.job,
      })),
    };
  }
}

export const jobBookmarkService = new JobBookmarkService();
