import { prisma } from "../lib/prisma.js";
import type { UserSettingsInput } from "../validators/user-settings.validator.js";

export type { UserSettingsInput };

/**
 * Defaults for a settings row.
 *
 * These are the same values the Settings page showed before the row existed, so
 * creating a row is indistinguishable from never having opened Settings.
 */
const SETTINGS_DEFAULTS = {
  emailNotifications: true,
  jobAlerts: true,
  applicationUpdates: true,
  interviewReminders: true,
  theme: "light",
  minMatchScore: 70,
  autoMatch: true,
} as const;

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

  /**
   * Read-only lookup for internal callers (notification and matching services)
   * that must not turn a missing row into a 404: an absent row means the user
   * has never opened Settings, which is treated as "everything enabled".
   */
  async findSettings(userId: string) {
    return prisma.userSettings.findUnique({
      where: {
        userId,
      },
    });
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
        ...SETTINGS_DEFAULTS,
        ...definedOnly(data),
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
      data: definedOnly(data),
    });
  }
}

/**
 * Drops keys whose value is `undefined`.
 *
 * Without this, spreading a partially filled input over the defaults would
 * overwrite a column with `undefined` and let Prisma fall back to the schema
 * default, silently discarding a deliberately chosen value.
 */
function definedOnly(data: UserSettingsInput): UserSettingsInput {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

export const userSettingsService =
  new UserSettingsService();
