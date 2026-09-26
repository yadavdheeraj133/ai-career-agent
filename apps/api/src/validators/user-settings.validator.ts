import { z } from "zod";

/**
 * The writable subset of `UserSettings`.
 *
 * The two string columns are closed enums rather than free text: they are read
 * back by the client to drive real behaviour (`theme` selects the rendered
 * colour scheme, `minMatchScore` is compared against match scores), so an
 * unrecognised value would leave the setting in a state nothing honours.
 */
export const THEME_VALUES = ["light", "dark", "system"] as const;
export const MIN_MATCH_SCORE_MIN = 0;
export const MIN_MATCH_SCORE_MAX = 100;

export type ThemeValue = (typeof THEME_VALUES)[number];

/**
 * The writable subset of `UserSettings`, as the service consumes it: every
 * column is optional because a PATCH only carries what changed.
 */
export type UserSettingsInput = Partial<{
  theme: ThemeValue;
  minMatchScore: number;
  emailNotifications: boolean;
  jobAlerts: boolean;
  applicationUpdates: boolean;
  interviewReminders: boolean;
  autoMatch: boolean;
}>;

/**
 * Every field is optional, so a PATCH only needs to carry what changed. The
 * object is also what decides "is this an update at all": the controller
 * rejects an empty parse result with 400 rather than silently no-op'ing, which
 * is the behaviour `/users/settings` PATCH has always had.
 *
 * Unknown keys are stripped rather than rejected, matching the previous
 * `typeof`-sniffing controller: a client that round-trips a previously fetched
 * settings object (which also carries `id`/`createdAt`) is not broken by it.
 */
export const updateUserSettingsSchema = z
  .object({
    theme: z.enum(THEME_VALUES).optional(),
    minMatchScore: z.coerce
      .number()
      .int()
      .min(MIN_MATCH_SCORE_MIN)
      .max(MIN_MATCH_SCORE_MAX)
      .optional(),
    emailNotifications: z.boolean().optional(),
    jobAlerts: z.boolean().optional(),
    applicationUpdates: z.boolean().optional(),
    interviewReminders: z.boolean().optional(),
    autoMatch: z.boolean().optional(),
  });
