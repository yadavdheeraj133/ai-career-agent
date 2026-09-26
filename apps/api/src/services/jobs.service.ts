import { Prisma } from "@prisma/client";
import { isDeveloperJob } from "../automation/developer-classifier.js";
import { jobRepository } from "../repositories/jobs.repository.js";

export class JobService {
  /**
   * Manual catalogue creation.
   *
   * The developer verdict is recorded here too so the row participates correctly
   * in the developer-scoped views (Find Jobs, Job Intelligence). Creation is not
   * rejected: this endpoint is an explicit, role-gated catalogue write, and
   * filtering it is the ingestion pipeline's job, not the CRUD layer's.
   */
  async createJob(data: Prisma.JobCreateInput) {
    const existingJob = await jobRepository.findByUrl(data.url);

    if (existingJob) {
      throw new Error("Job already exists");
    }

    return jobRepository.create({
      ...data,
      isDeveloperJob: isDeveloperJob(data),
    });
  }

  async getAllJobs() {
    return jobRepository.findAll();
  }

  async getJobById(id: string) {
    const job = await jobRepository.findById(id);

    if (!job) {
      throw new Error("Job not found");
    }

    return job;
  }

  async updateJob(id: string, data: Prisma.JobUpdateInput) {
    const job = await jobRepository.findById(id);

    if (!job) {
      throw new Error("Job not found");
    }

    return jobRepository.update(id, data);
  }

  async deleteJob(id: string) {
    const job = await jobRepository.findById(id);

    if (!job) {
      throw new Error("Job not found");
    }

    return jobRepository.delete(id);
  }
}

export const jobService = new JobService();