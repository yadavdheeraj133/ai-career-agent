import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

export class JobRepository {
  async create(data: Prisma.JobCreateInput) {
    return prisma.job.create({
      data,
    });
  }

  /**
   * Active jobs, newest first.
   *
   * `developerOnly` filters on the stored `isDeveloperJob` verdict rather than
   * re-classifying rows in application code: the verdict is decided once at
   * ingestion, is indexed, and keeps the historical dataset stable as the
   * classifier evolves.
   */
  async findAll(
    options: { includeExpired?: boolean; developerOnly?: boolean } = {}
  ) {
    return prisma.job.findMany({
      where: {
        ...(options.includeExpired ? {} : { status: "ACTIVE" }),
        ...(options.developerOnly ? { isDeveloperJob: true } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Paginated search over the job catalogue.
   *
   * Developer relevance is applied in SQL by default so Find Jobs only ever
   * surfaces the developer dataset; callers can opt out explicitly.
   */
  async search(
    where: Prisma.JobWhereInput,
    skip: number,
    take: number,
    options: { developerOnly?: boolean } = {}
  ) {
    const developerOnly = options.developerOnly ?? true;
    const scope: Prisma.JobWhereInput = {
      status: "ACTIVE",
      ...(developerOnly ? { isDeveloperJob: true } : {}),
      ...where,
    };

    const [jobs, total] = await prisma.$transaction([
      prisma.job.findMany({
        where: scope,
        orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      prisma.job.count({ where: scope }),
    ]);

    return { jobs, total };
  }

  async findById(id: string) {
    return prisma.job.findUnique({
      where: {
        id,
      },
    });
  }

  async findByUrl(url: string) {
    return prisma.job.findUnique({
      where: {
        url,
      },
    });
  }

  async findByExternalId(provider: string, externalId: string) {
    return prisma.job.findFirst({
      where: {
        provider,
        externalId,
      },
    });
  }

  async createFromProvider(data: Prisma.JobUncheckedCreateInput) {
    return prisma.job.create({ data });
  }

  /** Active jobs not seen by a provider since `cutoff` — candidates to expire. */
  async findStaleActiveJobs(cutoff: Date) {
    return prisma.job.findMany({
      where: {
        status: "ACTIVE",
        lastSeenAt: { lt: cutoff },
      },
    });
  }

  async markExpired(ids: string[], expiredAt: Date) {
    if (ids.length === 0) return { count: 0 };
    return prisma.job.updateMany({
      where: { id: { in: ids } },
      data: { status: "EXPIRED", expiredAt },
    });
  }

  async findEnrichmentCandidates(limit: number) {
    return prisma.job.findMany({
      where: {
        status: "ACTIVE",
        enrichment: { equals: Prisma.DbNull },
        description: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async setEnrichment(id: string, enrichment: Prisma.InputJsonValue) {
    return prisma.job.update({
      where: { id },
      data: { enrichment, enrichedAt: new Date() },
    });
  }

  async update(id: string, data: Prisma.JobUpdateInput) {
    return prisma.job.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: string) {
    return prisma.job.delete({
      where: {
        id,
      },
    });
  }
}

export const jobRepository = new JobRepository();