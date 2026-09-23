import { prisma } from "../lib/prisma.js";

export class SkillService {
  async getSkills(userId: string) {
    return prisma.skill.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  async addSkill(userId: string, name: string) {
    const normalizedName = name.trim();

    if (!normalizedName || normalizedName.length > 100) {
      throw new Error("Skill name must be between 1 and 100 characters.");
    }

    const existing = await prisma.skill.findFirst({
      where: {
        userId,
        name: { equals: normalizedName, mode: "insensitive" },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.skill.create({
      data: { userId, name: normalizedName },
    });
  }

  async removeSkill(userId: string, skillId: string) {
    const result = await prisma.skill.deleteMany({
      where: { id: skillId, userId },
    });

    if (result.count === 0) {
      throw new Error("Skill not found.");
    }
  }
}

export const skillService = new SkillService();