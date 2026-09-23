import { jobRepository } from "../repositories/jobs.repository.js";
import { prisma } from "../lib/prisma.js";
import { notificationService } from "./notifications.service.js";

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

export interface JobApplicationUpdate {
  status?:
    | "Applied"
    | "Interview"
    | "Offer"
    | "Rejected"
    | "Withdrawn";
  notes?: string;
}

function toApplicationView(
  application: {
    id: string;
    jobId: string;
    status: string;
    appliedAt: Date;
    notes: string;
  },
  job: { title: string; company: string; location: string }
) {
  return {
    id: application.id,
    jobId: application.jobId,
    job: {
      title: job.title,
      company: job.company,
      location: job.location,
    },
    status: application.status,
    appliedAt: application.appliedAt.toISOString(),
    notes: application.notes,
  };
}

export class JobApplicationService {
  async createApplication(userId: string, input: JobApplicationInput) {
    const job = await jobRepository.findById(input.jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    let appliedAt = new Date();
    if (input.appliedAt !== undefined) {
      appliedAt = new Date(input.appliedAt);
      if (Number.isNaN(appliedAt.getTime())) {
        throw new Error("appliedAt must be a valid ISO date string");
      }
    }

    // POST is idempotent per user+job so retries and double-submits update
    // the existing tracker row instead of failing on the unique constraint.
    const saved = await prisma.jobApplication.upsert({
      where: {
        userId_jobId: { userId, jobId: job.id },
      },
      create: {
        userId,
        jobId: job.id,
        status: input.status,
        appliedAt,
        notes: input.notes ?? "",
      },
      update: {
        status: input.status,
        appliedAt,
        notes: input.notes ?? "",
      },
    });

    return toApplicationView(saved, job);
  }

  async getApplication(userId: string, jobId: string) {
    const job = await jobRepository.findById(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    const application = await prisma.jobApplication.findUnique({
      where: {
        userId_jobId: { userId, jobId: job.id },
      },
    });

    if (!application) {
      return {
        jobId: job.id,
        job: {
          title: job.title,
          company: job.company,
          location: job.location,
        },
        status: null,
        appliedAt: null,
        notes: null,
      };
    }

    return toApplicationView(application, job);
  }

  async listApplications(userId: string, status?: string) {
    const applications = await prisma.jobApplication.findMany({
      where: status ? { userId, status } : { userId },
      include: { job: true },
      orderBy: { updatedAt: "desc" },
    });

    return {
      count: applications.length,
      data: applications.map((application) =>
        toApplicationView(application, application.job)
      ),
    };
  }

  async updateApplication(
    userId: string,
    applicationId: string,
    input: JobApplicationUpdate
  ) {
    const existing = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!existing || existing.userId !== userId) {
      throw new Error("Application not found");
    }

    const application = await prisma.jobApplication.update({
      where: { id: existing.id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      include: { job: true },
    });

    // Best-effort alert; a notification failure must not fail the update.
    if (input.status !== undefined && input.status !== existing.status) {
      try {
        await notificationService.notifyApplicationUpdate(
          userId,
          application.job,
          application.status
        );
      } catch {
        // ignore
      }
    }

    return toApplicationView(application, application.job);
  }
}

export const jobApplicationService = new JobApplicationService();
