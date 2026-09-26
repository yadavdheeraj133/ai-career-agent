-- Settings > Appearance / AI / Notifications.
--
-- The Settings page previously rendered controls for these values but had
-- nowhere to store them, so they were silently discarded on every save. They
-- are added to the existing UserSettings table (no new table, no new API) and
-- every column is added with the same default the UI showed, so existing rows
-- keep behaving exactly as before.
--
-- interviewReminders defaults to true so a user who never opened Settings
-- keeps the same notification volume they had before this change.

-- Appearance: light | dark | system
--
-- Defaults to 'light' rather than 'system' so that a row created here behaves
-- exactly like an account that has never opened Settings, which the client
-- also falls back to.
ALTER TABLE "UserSettings" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';

-- AI: strong-match cutoff, replacing the previously hard-coded constant when a
-- user has not chosen one (the API still falls back to it).
ALTER TABLE "UserSettings" ADD COLUMN "minMatchScore" INTEGER NOT NULL DEFAULT 70;

-- AI: automatically match newly aggregated jobs against saved preferences.
ALTER TABLE "UserSettings" ADD COLUMN "autoMatch" BOOLEAN NOT NULL DEFAULT true;

-- Notifications: interview-stage application alerts.
ALTER TABLE "UserSettings" ADD COLUMN "interviewReminders" BOOLEAN NOT NULL DEFAULT true;
