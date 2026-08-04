import { prisma } from "../lib/prisma.js";
import { CreateResumeInput } from "../validators/auth/create-resume.validator.js";

export class ResumeRepository {
  async createResume(userId: string, data: CreateResumeInput) {
    return prisma.resume.create({
      data: {
        ...data,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getResumeByUserId(userId: string) {
    return prisma.resume.findUnique({
      where: {
        userId,
      },
    });
  }

  async updateResume(userId: string, data: Partial<CreateResumeInput>) {
    return prisma.resume.update({
      where: {
        userId,
      },
      data,
    });
  }

  async deleteResume(userId: string) {
    return prisma.resume.delete({
      where: {
        userId,
      },
    });
  }
}

export const resumeRepository = new ResumeRepository();