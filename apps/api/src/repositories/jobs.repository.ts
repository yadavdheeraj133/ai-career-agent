import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

export class JobRepository {
  async create(data: Prisma.JobCreateInput) {
    return prisma.job.create({
      data,
    });
  }

  async findAll() {
    return prisma.job.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
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