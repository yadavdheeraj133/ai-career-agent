import { Prisma } from "@prisma/client";

import {
  AggregatedJob,
  JobAggregationResult,
} from "../types/job.type.js";

import { isDeveloperJob } from "../automation/developer-classifier.js";
import { jobRepository } from "../repositories/jobs.repository.js";

export class JobAggregatorService {
  /**
   * HTTP ingestion path for `POST /api/jobs/aggregate`.
   *
   * Applies the same developer-only policy as the automation pipeline so the
   * endpoint cannot be used to push unrelated roles into the job dataset, and
   * records the verdict on the stored row.
   */
  async aggregateJobs(
    jobs: AggregatedJob[]
  ): Promise<JobAggregationResult> {
    let created = 0;
    let skipped = 0;

    const developerJobs = jobs.filter((job) => isDeveloperJob(job));

    for (const job of developerJobs) {
      const existingJob =
        await jobRepository.findByUrl(job.url);

      if (existingJob) {
        skipped++;
        continue;
      }

      const data: Prisma.JobCreateInput = {
        title: job.title,
        company: job.company,
        location: job.location,
        workMode: job.workMode,
        jobType: job.jobType,
        experience: job.experience,
        salary: job.salary,
        description: job.description,
        source: job.source,
        url: job.url,
        isDeveloperJob: true,
      };

      try {
        await jobRepository.create(data);
      } catch (error) {
        // Lost a concurrent-insert race on the unique url: the row already
        // exists, so count it as skipped instead of failing the batch.
        if (
          typeof error !== "object" ||
          error === null ||
          (error as { code?: unknown }).code !== "P2002"
        ) {
          throw error;
        }
        skipped++;
        continue;
      }

      created++;
    }

    return {
      source: jobs[0]?.source ?? "unknown",
      fetched: jobs.length,
      accepted: developerJobs.length,
      rejected: jobs.length - developerJobs.length,
      created,
      skipped,
      jobs: developerJobs,
    };
  }
}

export const jobAggregatorService =
  new JobAggregatorService();