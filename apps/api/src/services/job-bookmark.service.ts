import { jobRepository } from "../repositories/jobs.repository.js";

export class JobBookmarkService {
  async bookmarkJob(jobId: string) {
    const job = await jobRepository.findById(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    return {
      jobId: job.id,
      bookmarked: true,
    };
  }

  async removeBookmark(jobId: string) {
    const job = await jobRepository.findById(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    return {
      jobId: job.id,
      bookmarked: false,
    };
  }
}

export const jobBookmarkService =
  new JobBookmarkService();