"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  applyTheme,
  getStoredTheme,
  isTheme,
  THEME_VALUES,
  type Theme,
} from "@/lib/theme";
import type { UserPreferences, UserSettings } from "@/lib/types";
import {
  DEFAULT_SECTION,
  isSettingsSection,
  sectionSavesSettings,
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from "./settings-sections";

const WORK_MODES = ["Remote", "Hybrid", "Onsite"] as const;
const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Internship",
  "Contract",
  "Freelance",
] as const;

/**
 * The values a brand new `UserSettings` row is created with.
 *
 * `/users/settings` answers 404 until a row exists, and the same defaults are
 * applied server-side on POST (`SETTINGS_DEFAULTS` in
 * `user-settings.service.ts`), so a first visit renders the real state instead
 * of a blank form that silently overwrites it.
 */
const DEFAULT_SETTINGS_DRAFT: SettingsDraft = {
  theme: "light",
  minMatchScore: 70,
  autoMatch: true,
  emailNotifications: true,
  jobAlerts: true,
  applicationUpdates: true,
  interviewReminders: true,
};

const DEFAULT_PREFERENCES_DRAFT: PreferencesDraft = {
  jobRole: "",
  location: "",
  workMode: "Remote",
  jobType: "Full-time",
  salary: "",
};

type PreferencesDraft = {
  jobRole: string;
  location: string;
  workMode: string;
  jobType: string;
  salary: string;
};

type SettingsDraft = {
  theme: Theme;
  minMatchScore: number;
  autoMatch: boolean;
  emailNotifications: boolean;
  jobAlerts: boolean;
  applicationUpdates: boolean;
  interviewReminders: boolean;
};

/**
 * `/users/settings` and `/api/preferences` only exist once a row has been
 * created; a 404 means "never saved", which is different from a failure and is
 * therefore the only status treated as an empty result.
 */
async function fetchOptional<T>(path: string): Promise<T | null> {
  try {
    const response = await apiRequest<T>(path);
    return response.data;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      return null;
    }
    throw caught;
  }
}

function sameDraft(a: PreferencesDraft, b: PreferencesDraft): boolean {
  return (
    a.jobRole === b.jobRole &&
    a.location === b.location &&
    a.workMode === b.workMode &&
    a.jobType === b.jobType &&
    a.salary === b.salary
  );
}

export default function SettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();

  const sectionParam = searchParams.get("section");
  const section: SettingsSectionId = isSettingsSection(sectionParam)
    ? sectionParam
    : DEFAULT_SECTION;

  const [preferences, setPreferences] = useState<PreferencesDraft>(
    DEFAULT_PREFERENCES_DRAFT
  );
  const [settings, setSettings] = useState<SettingsDraft>(
    DEFAULT_SETTINGS_DRAFT
  );

  /**
   * The last values the API confirmed. Everything the user has touched since
   * is "unsaved", which is what the Save Changes bar reports and what decides
   * whether saving is worth a request at all.
   */
  const [savedPreferences, setSavedPreferences] = useState<PreferencesDraft>(
    DEFAULT_PREFERENCES_DRAFT
  );
  const [savedSettings, setSavedSettings] = useState<SettingsDraft>(
    DEFAULT_SETTINGS_DRAFT
  );

  const [hasPreferences, setHasPreferences] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Guards the load effect against a slow response overwriting a later one, and
  // keeps the "saved" flash from clearing after the component unmounts.
  const savedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimer.current !== null) {
        window.clearTimeout(savedTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [storedPreferences, storedSettings] = await Promise.all([
          fetchOptional<UserPreferences>("/api/preferences"),
          fetchOptional<UserSettings>("/users/settings"),
        ]);

        if (cancelled) return;

        if (storedPreferences) {
          const draft: PreferencesDraft = {
            jobRole: storedPreferences.jobRole ?? "",
            location: storedPreferences.location ?? "",
            workMode: storedPreferences.workMode || DEFAULT_PREFERENCES_DRAFT.workMode,
            jobType: storedPreferences.jobType || DEFAULT_PREFERENCES_DRAFT.jobType,
            salary: storedPreferences.salary ?? "",
          };
          setHasPreferences(true);
          setPreferences(draft);
          setSavedPreferences(draft);
        } else {
          setHasPreferences(false);
        }

        if (storedSettings) {
          const draft: SettingsDraft = {
            theme: isTheme(storedSettings.theme)
              ? storedSettings.theme
              : DEFAULT_SETTINGS_DRAFT.theme,
            minMatchScore: storedSettings.minMatchScore,
            autoMatch: storedSettings.autoMatch,
            emailNotifications: storedSettings.emailNotifications,
            jobAlerts: storedSettings.jobAlerts,
            applicationUpdates: storedSettings.applicationUpdates,
            interviewReminders: storedSettings.interviewReminders,
          };
          setHasSettings(true);
          setSettings(draft);
          setSavedSettings(draft);

          // The account is the source of truth: a signed-in user on a second
          // device sees the theme they chose on the first one. The stored value
          // stays the preference ("system" keeps following the OS), so this
          // never downgrades a deliberate local choice on a later visit unless
          // the account itself says otherwise.
          if (draft.theme !== getStoredTheme()) {
            applyTheme(draft.theme);
          }
        } else {
          setHasSettings(false);
        }
      } catch (caught) {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load your settings."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function goToSection(next: SettingsSectionId) {
    if (next === section) return;

    // Section state lives in this component, not in the URL, so switching never
    // discards an edit made in another section.
    router.replace(
      next === DEFAULT_SECTION ? "/setting" : `/setting?section=${next}`,
      { scroll: false }
    );
  }

  function flashSaved() {
    setSaved(true);

    if (savedTimer.current !== null) {
      window.clearTimeout(savedTimer.current);
    }

    savedTimer.current = window.setTimeout(() => {
      setSaved(false);
      savedTimer.current = null;
    }, 2400);
  }

  /**
   * Writes to `/users/settings`, creating the row on first save.
   *
   * Only the keys in `patch` become the new saved baseline, so a save in one
   * section never silently marks an unrelated section's unsaved edits as
   * persisted.
   */
  async function persistSettings(patch: Partial<SettingsDraft>) {
    const response = await apiRequest<UserSettings>("/users/settings", {
      method: hasSettings ? "PATCH" : "POST",
      body: patch,
    });

    setHasSettings(true);
    setSavedSettings((previous) => ({ ...previous, ...patch }));

    return response.data;
  }

  async function persistPreferences(draft: PreferencesDraft) {
    const response = await apiRequest<UserPreferences>("/api/preferences", {
      method: hasPreferences ? "PATCH" : "POST",
      body: {
        jobRole: draft.jobRole,
        location: draft.location,
        workMode: draft.workMode,
        jobType: draft.jobType,
        salary: draft.salary,
      },
    });

    setHasPreferences(true);
    setSavedPreferences(draft);

    return response.data;
  }

  /**
   * The `UserSettings` fields the section on screen owns, or `null` for a
   * section that writes nothing here (Preferences has its own table, Security
   * acts immediately).
   *
   * Being the single place that decides what a section saves is what guarantees
   * the button can never write a field the section does not show, and that the
   * "unsaved" check covers exactly the same set of fields.
   */
  function settingsSectionPayload(): Partial<SettingsDraft> | null {
    if (section === "appearance") return { theme: settings.theme };

    if (section === "ai") {
      return {
        minMatchScore: settings.minMatchScore,
        autoMatch: settings.autoMatch,
      };
    }

    if (section === "notifications") {
      return {
        emailNotifications: settings.emailNotifications,
        jobAlerts: settings.jobAlerts,
        applicationUpdates: settings.applicationUpdates,
        interviewReminders: settings.interviewReminders,
      };
    }

    return null;
  }

  const dirty = (() => {
    if (section === "preferences") {
      return !sameDraft(preferences, savedPreferences);
    }

    const payload = settingsSectionPayload();
    if (payload === null) return false;

    const baseline = savedSettings as unknown as Record<string, unknown>;

    return Object.entries(payload).some(([key, value]) => baseline[key] !== value);
  })();

  /**
   * Saves the section that is on screen, and nothing else.
   *
   * A failure leaves the baseline untouched, so the panel keeps reporting the
   * edits as unsaved and the "Saved" state is never shown for a request that
   * did not reach the database.
   */
  async function save() {
    if (saving || loading) return;

    setError(null);
    setSecurityNotice(null);
    setSaved(false);
    setSaving(true);

    try {
      if (section === "preferences") {
        await persistPreferences(preferences);
      } else {
        const payload = settingsSectionPayload();

        if (payload !== null) {
          await persistSettings(payload);
        }
      }

      flashSaved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save your settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function selectTheme(theme: Theme) {
    setSettings((previous) => ({ ...previous, theme }));
    // Applied straight away, exactly like the header toggle: the selection
    // previews itself and is written to the account by Save Changes.
    applyTheme(theme);
  }

  async function changePassword() {
    setError(null);
    setSecurityNotice(null);

    if (!currentPassword || !newPassword) {
      setError("Enter your current password and a new password.");
      return;
    }

    setChangingPassword(true);

    try {
      await apiRequest("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setSecurityNotice("Password changed successfully.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to change your password."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Delete your account and all associated data? This cannot be undone."
      )
    ) {
      return;
    }

    setError(null);
    setSecurityNotice(null);
    setDeleting(true);

    try {
      await apiRequest("/users/profile", { method: "DELETE" });
      logout();
      router.replace("/auth/login");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete your account."
      );
      setDeleting(false);
    }
  }

  return (
    <main className="feature-page settings-page">
      <div className="feature-container">
        <header className="settings-header">
          <div className="settings-header-aside">
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>
          </div>

          <div className="settings-header-title">
            <h1>Settings</h1>

            <p className="feature-description">
              Control how the AI Career Agent looks, behaves and talks to you.
              Changes apply across your workspace.
            </p>
          </div>

          <div className="settings-header-aside" aria-hidden="true" />
        </header>

        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Settings sections">
            <p className="settings-nav-label">SETTINGS</p>

            {SETTINGS_SECTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`settings-nav-item ${
                  section === item.id ? "active" : ""
                }`}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => goToSection(item.id)}
              >
                <span className="settings-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <section className="settings-panel">
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            {securityNotice ? (
              <p className="form-notice" role="status">
                {securityNotice}
              </p>
            ) : null}

            {loading ? (
              <div className="settings-loading" role="status" aria-live="polite">
                <span className="app-loading-spinner" aria-hidden="true" />
                <p>Loading your settings…</p>
              </div>
            ) : (
              <>
                {section === "appearance" && (
                  <div className="settings-section">
                    <p className="card-label">APPEARANCE</p>

                    <h2>Look and feel</h2>

                    <p>
                      Choose the theme used across the workspace. It applies
                      immediately and is kept on your account.
                    </p>

                    <div className="settings-field">
                      <label id="settings-theme-label">Theme</label>

                      <div
                        className="settings-choice-group"
                        role="group"
                        aria-labelledby="settings-theme-label"
                      >
                        {THEME_VALUES.map((option) => (
                          <button
                            type="button"
                            key={option}
                            className={`settings-choice ${
                              settings.theme === option ? "active" : ""
                            }`}
                            aria-pressed={settings.theme === option}
                            onClick={() => selectTheme(option)}
                          >
                            {capitalise(option)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="settings-hint">
                      <strong>System</strong> follows your operating system and
                      switches automatically. Light and Dark stay where you put
                      them.
                    </p>
                  </div>
                )}

                {section === "preferences" && (
                  <div className="settings-section">
                    <p className="card-label">PREFERENCES</p>

                    <h2>Search defaults</h2>

                    <p>
                      Defaults used to rank jobs, match your profile and decide
                      which new jobs reach you.
                    </p>

                    <div className="settings-grid">
                      <div className="settings-field">
                        <label htmlFor="settings-job-role">Target role</label>
                        <input
                          id="settings-job-role"
                          type="text"
                          value={preferences.jobRole}
                          placeholder="Full Stack Developer"
                          onChange={(event) =>
                            setPreferences((previous) => ({
                              ...previous,
                              jobRole: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="settings-field">
                        <label htmlFor="settings-location">Location</label>
                        <input
                          id="settings-location"
                          type="text"
                          value={preferences.location}
                          placeholder="Mumbai"
                          onChange={(event) =>
                            setPreferences((previous) => ({
                              ...previous,
                              location: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="settings-field">
                        <label htmlFor="settings-work-mode">Work mode</label>
                        <select
                          id="settings-work-mode"
                          value={preferences.workMode}
                          onChange={(event) =>
                            setPreferences((previous) => ({
                              ...previous,
                              workMode: event.target.value,
                            }))
                          }
                        >
                          {WORK_MODES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="settings-field">
                        <label htmlFor="settings-job-type">Job type</label>
                        <select
                          id="settings-job-type"
                          value={preferences.jobType}
                          onChange={(event) =>
                            setPreferences((previous) => ({
                              ...previous,
                              jobType: event.target.value,
                            }))
                          }
                        >
                          {JOB_TYPES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="settings-field">
                        <label htmlFor="settings-salary">Salary expectation</label>
                        <input
                          id="settings-salary"
                          type="text"
                          value={preferences.salary}
                          placeholder="$120k"
                          onChange={(event) =>
                            setPreferences((previous) => ({
                              ...previous,
                              salary: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <p className="settings-hint">
                      Saved preferences drive job matching, the dashboard
                      summary and the alerts sent when new jobs are aggregated.
                    </p>
                  </div>
                )}

                {section === "ai" && (
                  <div className="settings-section">
                    <p className="card-label">AI</p>

                    <h2>How the agent helps</h2>

                    <p>
                      Control how aggressively the agent matches new jobs
                      against your saved preferences.
                    </p>

                    <div className="settings-field">
                      <label id="settings-min-match-label">
                        Minimum match score
                      </label>

                      <div className="settings-range-row">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          aria-labelledby="settings-min-match-label"
                          value={settings.minMatchScore}
                          onChange={(event) =>
                            setSettings((previous) => ({
                              ...previous,
                              minMatchScore: Number(event.target.value),
                            }))
                          }
                        />

                        <output className="settings-range-value">
                          {settings.minMatchScore}
                        </output>
                      </div>

                      <p className="settings-field-hint">
                        Jobs scoring {settings.minMatchScore} or higher are
                        counted as strong matches.
                      </p>
                    </div>

                    <label className="settings-toggle">
                      <span>
                        <strong>Auto-match new jobs</strong>
                        <small>
                          Analyse newly aggregated jobs against your profile.
                        </small>
                      </span>

                      <input
                        type="checkbox"
                        checked={settings.autoMatch}
                        onChange={(event) =>
                          setSettings((previous) => ({
                            ...previous,
                            autoMatch: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  </div>
                )}

                {section === "notifications" && (
                  <div className="settings-section">
                    <p className="card-label">NOTIFICATIONS</p>

                    <h2>What should reach you</h2>

                    <p>
                      Choose which updates the agent should send your way.
                    </p>

                    <label className="settings-toggle">
                      <span>
                        <strong>Email notifications</strong>
                        <small>
                          Master switch for every notification below.
                        </small>
                      </span>

                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(event) =>
                          setSettings((previous) => ({
                            ...previous,
                            emailNotifications: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    <label className="settings-toggle">
                      <span>
                        <strong>Job alerts</strong>
                        <small>New jobs that match your profile.</small>
                      </span>

                      <input
                        type="checkbox"
                        checked={settings.jobAlerts}
                        disabled={!settings.emailNotifications}
                        onChange={(event) =>
                          setSettings((previous) => ({
                            ...previous,
                            jobAlerts: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    <label className="settings-toggle">
                      <span>
                        <strong>Application updates</strong>
                        <small>Status changes on your applications.</small>
                      </span>

                      <input
                        type="checkbox"
                        checked={settings.applicationUpdates}
                        disabled={!settings.emailNotifications}
                        onChange={(event) =>
                          setSettings((previous) => ({
                            ...previous,
                            applicationUpdates: event.target.checked,
                          }))
                        }
                      />
                    </label>

                    <label className="settings-toggle">
                      <span>
                        <strong>Interview reminders</strong>
                        <small>
                          Reminders when an application reaches the interview
                          stage.
                        </small>
                      </span>

                      <input
                        type="checkbox"
                        checked={settings.interviewReminders}
                        disabled={!settings.emailNotifications}
                        onChange={(event) =>
                          setSettings((previous) => ({
                            ...previous,
                            interviewReminders: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  </div>
                )}

                {section === "security" && (
                  <div className="settings-section">
                    <p className="card-label">SECURITY</p>

                    <h2>Account security</h2>

                    <p>
                      Change your password or delete your account and all of
                      its data.
                    </p>

                    <div className="settings-grid">
                      <div className="settings-field">
                        <label htmlFor="settings-current-password">
                          Current password
                        </label>
                        <input
                          id="settings-current-password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                        />
                      </div>

                      <div className="settings-field">
                        <label htmlFor="settings-new-password">New password</label>
                        <input
                          id="settings-new-password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="settings-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void changePassword()}
                        disabled={changingPassword || deleting}
                      >
                        {changingPassword ? "Changing…" : "Change Password"}
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => void deleteAccount()}
                        disabled={deleting || changingPassword}
                      >
                        {deleting ? "Deleting…" : "Delete Account"}
                      </button>
                    </div>

                    <p className="settings-hint">
                      Security changes take effect as soon as they succeed, so
                      they do not need saving.
                    </p>
                  </div>
                )}
              </>
            )}

            {!loading && sectionSavesSettings(section) && (
              <footer className="settings-footer">
                <p className="settings-footer-status" role="status" aria-live="polite">
                  {saving
                    ? "Saving…"
                    : error
                      ? "Not saved — check the message above."
                      : saved
                        ? "Saved."
                        : dirty
                          ? "Unsaved changes"
                          : "All changes saved"}
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void save()}
                  disabled={saving || loading || !dirty}
                >
                  {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
                </button>
              </footer>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
