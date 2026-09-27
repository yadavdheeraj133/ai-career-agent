/**
 * The Settings sections that exist, in the order they appear in the left
 * navigation. The id doubles as the `?section=` value in the URL, so it has to
 * be stable.
 *
 * Icons are the same glyph set the dashboard sidebar uses (`Sidebar.tsx`), so
 * Settings reads as part of the same product.
 */
export const SETTINGS_SECTIONS = [
  { id: "appearance", label: "Appearance", icon: "◐" },
  { id: "preferences", label: "Preferences", icon: "☰" },
  { id: "ai", label: "AI", icon: "✦" },
  { id: "notifications", label: "Notifications", icon: "◔" },
  { id: "security", label: "Security", icon: "◈" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export const DEFAULT_SECTION: SettingsSectionId = "appearance";

export function isSettingsSection(
  value: string | null | undefined
): value is SettingsSectionId {
  return SETTINGS_SECTIONS.some((section) => section.id === value);
}

/**
 * Security is the one section with nothing to save: every control in it acts
 * immediately (password change, account deletion) through its own endpoint, so
 * it does not render the Save Changes bar.
 */
export function sectionSavesSettings(section: SettingsSectionId): boolean {
  return section !== "security";
}
