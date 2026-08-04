import { Prisma } from "@prisma/client";
import { jobRepository } from "../repositories/jobs.repository.js";

export class JobService {
  async createJob(data: Prisma.JobCreateInput) {
    const existingJob = await jobRepository.findByUrl(data.url);

    if (existingJob) {
      throw new Error("Job already exists");
    }

    return jobRepository.create(data);
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