import { prisma } from "../lib/prisma.js";

export interface UserPreferencesInput {
  jobRole?: string;
  location?: string;
  workMode?: string;
  jobType?: string;
  salary?: string;
}

export class UserPreferencesService {
  async getPreferences(userId: string) {
    const preferences =
      await prisma.userPreferences.findUnique({
        where: {
          userId,
        },
      });

    if (!preferences) {
      throw new Error("User preferences not found");
    }

    return preferences;
  }

  async createPreferences(
    userId: string,
    data: UserPreferencesInput
  ) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const existingPreferences =
      await prisma.userPreferences.findUnique({
        where: {
          userId,
        },
      });

    if (existingPreferences) {
      throw new Error(
        "User preferences already exist"
      );
    }

    return prisma.userPreferences.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async updatePreferences(
    userId: string,
    data: UserPreferencesInput
  ) {
    const existingPreferences =
      await prisma.userPreferences.findUnique({
        where: {
          userId,
        },
      });

    if (!existingPreferences) {
      throw new Error("User preferences not found");
    }

    return prisma.userPreferences.update({
      where: {
        userId,
      },
      data,
    });
  }
}

export const userPreferencesService =
  new UserPreferencesService();