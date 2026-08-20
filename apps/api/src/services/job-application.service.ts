import { jobRepository } from "../repositories/jobs.repository.js";

export interface JobApplicationInput {
  jobId: string;
  status:
    | "Applied"
    | "Interview"
    | "Offer"
    | "Rejected"
    | "Withdrawn";
  appliedAt?: string;
  notes?: string;
}

export class JobApplicationService {
  async createApplication(
    input: JobApplicationInput
  ) {
    const job = await jobRepository.findById(
      input.jobId
    );

    if (!job) {
      throw new Error("Job not found");
    }

    return {
      jobId: job.id,
      job: {
        title: job.title,
        company: job.company,
        location: job.location,
      },
      status: input.status,
      appliedAt:
        input.appliedAt ?? new Date().toISOString(),
      notes: input.notes ?? "",
    };
  }

  async getApplication(jobId: string) {
    const job = await jobRepository.findById(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    return {
      jobId: job.id,
      job: {
        title: job.title,
        company: job.company,
        location: job.location,
      },
    };
  }
}

export const jobApplicationService =
  new JobApplicationService();