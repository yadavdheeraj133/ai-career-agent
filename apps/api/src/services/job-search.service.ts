import type { Prisma } from "@prisma/client";

import { jobRepository } from "../repositories/jobs.repository.js";

export interface JobSearchFilters {
  keyword?: string;
  location?: string;
  workMode?: "Remote" | "Hybrid" | "Onsite";
  jobType?:
    | "Full-time"
    | "Part-time"
    | "Internship"
    | "Contract"
    | "Freelance";
  experience?: string;
  source?: string;
}

export interface JobSearchPagination {
  page: number;
  pageSize: number;
}

export class JobSearchService {
  /**
   * Find Jobs.
   *
   * Defaults to the developer-relevant dataset: relevance is part of the query
   * (`isDeveloperJob`), so unrelated historical rows are never scanned, and the
   * remaining filters, ordering and pagination are all applied by the database
   * rather than in memory.
   */
  async searchJobs(
    filters: JobSearchFilters,
    pagination: JobSearchPagination = { page: 1, pageSize: 50 }
  ) {
    const keyword = filters.keyword?.trim();
    const location = filters.location?.trim();
    const experience = filters.experience?.trim();
    const source = filters.source?.trim();

    const where: Prisma.JobWhereInput = {};

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { company: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (location) {
      where.location = { contains: location, mode: "insensitive" };
    }
    if (filters.workMode) {
      where.workMode = filters.workMode;
    }
    if (filters.jobType) {
      where.jobType = filters.jobType;
    }
    if (experience) {
      where.experience = { contains: experience, mode: "insensitive" };
    }
    if (source) {
      where.source = { equals: source, mode: "insensitive" };
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const { jobs, total } = await jobRepository.search(
      where,
      skip,
      pagination.pageSize
    );

    return {
      jobs,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }
}

export const jobSearchService =
  new JobSearchService();