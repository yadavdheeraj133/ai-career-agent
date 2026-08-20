import { prisma } from "../lib/prisma.js";

export interface UserSettingsInput {
  emailNotifications?: boolean;
  jobAlerts?: boolean;
  applicationUpdates?: boolean;
}

export class UserSettingsService {
  async getSettings(userId: string) {
    const settings = await prisma.userSettings.findUnique({
      where: {
        userId,
      },
    });

    if (!settings) {
      throw new Error("User settings not found");
    }

    return settings;
  }

  async createSettings(
    userId: string,
    data: UserSettingsInput
  ) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const existingSettings =
      await prisma.userSettings.findUnique({
        where: {
          userId,
        },
      });

    if (existingSettings) {
      throw new Error("User settings already exist");
    }

    return prisma.userSettings.create({
      data: {
        userId,
        emailNotifications:
          data.emailNotifications ?? true,
        jobAlerts: data.jobAlerts ?? true,
        applicationUpdates:
          data.applicationUpdates ?? true,
      },
    });
  }

  async updateSettings(
    userId: string,
    data: UserSettingsInput
  ) {
    const existingSettings =
      await prisma.userSettings.findUnique({
        where: {
          userId,
        },
      });

    if (!existingSettings) {
      throw new Error("User settings not found");
    }

    return prisma.userSettings.update({
      where: {
        userId,
      },
      data,
    });
  }
}

export const userSettingsService =
  new UserSettingsService();