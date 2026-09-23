"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "./settings.css";

import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserPreferences, UserSettings } from "@/lib/types";

const sections = [
  { id: "appearance", label: "Appearance", icon: "◐" },
  { id: "preferences", label: "Preferences", icon: "☰" },
  { id: "ai", label: "AI", icon: "✦" },
  { id: "jobs", label: "Jobs", icon: "◫" },
  { id: "notifications", label: "Notifications", icon: "◔" },
  { id: "security", label: "Security", icon: "◈" },
];

const aiTones = ["Professional", "Balanced", "Concise"];
const jobSources = ["LinkedIn", "Wellfound", "Naukri", "Company sites"];

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

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout, refresh } = useAuth();

  const [active, setActive] = useState("appearance");
  const [theme, setTheme] = useState("Light");
  const [accent, setAccent] = useState("Violet");
  const [aiTone, setAiTone] = useState("Balanced");
  const [autoMatch, setAutoMatch] = useState(true);
  const [minScore, setMinScore] = useState(70);
  const [interviewReminders, setInterviewReminders] = useState(false);

  const [name, setName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("Remote");
  const [jobType, setJobType] = useState("Full-time");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [applicationUpdates, setApplicationUpdates] = useState(true);

  const [hasPreferences, setHasPreferences] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setName(user?.name ?? "");

      try {
        const [preferences, settings] = await Promise.all([
          fetchOptional<UserPreferences>("/api/preferences"),
          fetchOptional<UserSettings>("/users/settings"),
        ]);

        if (cancelled) return;

        if (preferences) {
          setHasPreferences(true);
          setJobRole(preferences.jobRole ?? "");
          setLocation(preferences.location ?? "");
          if (preferences.workMode) setWorkMode(preferences.workMode);
          if (preferences.jobType) setJobType(preferences.jobType);
        } else {
          setHasPreferences(false);
        }

        if (settings) {
          setHasSettings(true);
          setEmailNotifications(settings.emailNotifications);
          setJobAlerts(settings.jobAlerts);
          setApplicationUpdates(settings.applicationUpdates);
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
  }, [user]);

  async function save() {
    setError(null);
    setNotice(null);
    setSaving(true);

    try {
      const tasks: Promise<unknown>[] = [];

      if (user && name.trim() && name.trim() !== user.name) {
        tasks.push(
          apiRequest("/users/profile", {
            method: "PATCH",
            body: { name: name.trim() },
          })
        );
      }

      const preferenceBody = {
        jobRole: jobRole.trim(),
        location: location.trim(),
        workMode,
        jobType,
      };

      tasks.push(
        hasPreferences
          ? apiRequest("/api/preferences", { method: "PATCH", body: preferenceBody })
          : apiRequest("/api/preferences", { method: "POST", body: preferenceBody }).then(
              () => setHasPreferences(true)
            )
      );

      const settingsBody = {
        emailNotifications,
        jobAlerts,
        applicationUpdates,
      };

      tasks.push(
        hasSettings
          ? apiRequest("/users/settings", { method: "PATCH", body: settingsBody })
          : apiRequest("/users/settings", { method: "POST", body: settingsBody }).then(
              () => setHasSettings(true)
            )
      );

      await Promise.all(tasks);
      await refresh();

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save your settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleChangePassword() {
    setError(null);
    setNotice(
      "For security, password changes are confirmed by email. Use “Forgot password?” to set a new one."
    );
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
    setNotice(null);
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
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">WORKSPACE</p>

            <h1>Settings</h1>

            <p className="feature-description">
              Control how the AI Career Agent looks, behaves and talks to
              you. Changes apply across your workspace.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => void save()}
            disabled={saving || loading}
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </header>

        <div className="settings-layout">
          <nav className="settings-nav">
            <p className="settings-nav-label">SETTINGS</p>

            {sections.map((section) => (
              <button
                type="button"
                key={section.id}
                className={`settings-nav-item ${
                  active === section.id ? "active" : ""
                }`}
                onClick={() => setActive(section.id)}
              >
                <span>{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>

          <section className="settings-panel">
            {error ? <p className="form-error">{error}</p> : null}
            {notice ? <p className="form-notice">{notice}</p> : null}

            {active === "appearance" && (
              <div className="settings-section">
                <p className="card-label">APPEARANCE</p>

                <h2>Look and feel</h2>

                <p>
                  Choose the theme and accent used across the workspace.
                </p>

                <div className="settings-field">
                  <label>Theme</label>

                  <div className="settings-choice-group">
                    {["Light", "Dark", "System"].map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={`settings-choice ${
                          theme === option ? "active" : ""
                        }`}
                        onClick={() => setTheme(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-field">
                  <label>Accent</label>

                  <div className="settings-choice-group">
                    {["Violet", "Teal", "Blue"].map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={`settings-choice ${
                          accent === option ? "active" : ""
                        }`}
                        onClick={() => setAccent(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {active === "preferences" && (
              <div className="settings-section">
                <p className="card-label">PREFERENCES</p>

                <h2>Search defaults</h2>

                <p>
                  Defaults pre-fill your Find Jobs search so you can start
                  faster.
                </p>

                <div className="settings-grid">
                  <div className="settings-field">
                    <label>Display Name</label>
                    <input
                      type="text"
                      value={name}
                      placeholder="Your name"
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>

                  <div className="settings-field">
                    <label>Default Role</label>
                    <input
                      type="text"
                      value={jobRole}
                      placeholder="Full Stack Developer"
                      onChange={(event) => setJobRole(event.target.value)}
                    />
                  </div>

                  <div className="settings-field">
                    <label>Default Location</label>
                    <input
                      type="text"
                      value={location}
                      placeholder="Mumbai"
                      onChange={(event) => setLocation(event.target.value)}
                    />
                  </div>

                  <div className="settings-field">
                    <label>Default Work Mode</label>
                    <select
                      value={workMode}
                      onChange={(event) => setWorkMode(event.target.value)}
                    >
                      <option>Remote</option>
                      <option>Hybrid</option>
                      <option>Onsite</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Default Job Type</label>
                    <select
                      value={jobType}
                      onChange={(event) => setJobType(event.target.value)}
                    >
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Internship</option>
                      <option>Contract</option>
                      <option>Freelance</option>
                    </select>
                  </div>
                </div>

                <p className="settings-hint">
                  Career-specific preferences are managed in the Career
                  section.
                </p>
              </div>
            )}

            {active === "ai" && (
              <div className="settings-section">
                <p className="card-label">AI</p>

                <h2>How the agent helps</h2>

                <p>
                  Tune the tone of generated content and let the agent
                  proactively analyse new jobs.
                </p>

                <div className="settings-field">
                  <label>AI Tone</label>

                  <div className="settings-choice-group">
                    {aiTones.map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={`settings-choice ${
                          aiTone === option ? "active" : ""
                        }`}
                        onClick={() => setAiTone(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
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
                    checked={autoMatch}
                    onChange={(event) => setAutoMatch(event.target.checked)}
                  />
                </label>
              </div>
            )}

            {active === "jobs" && (
              <div className="settings-section">
                <p className="card-label">JOBS</p>

                <h2>Job sources</h2>

                <p>
                  Pick the sources the agent should prioritise when
                  searching for roles.
                </p>

                <div className="settings-chip-group">
                  {jobSources.map((source) => (
                    <span className="settings-chip" key={source}>
                      {source}
                    </span>
                  ))}
                </div>

                <div className="settings-field">
                  <label>Minimum Match Score</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minScore}
                    onChange={(event) => setMinScore(Number(event.target.value))}
                  />
                </div>
              </div>
            )}

            {active === "notifications" && (
              <div className="settings-section">
                <p className="card-label">NOTIFICATIONS</p>

                <h2>What should reach you</h2>

                <p>
                  Choose which updates the agent should send your way.
                </p>

                <label className="settings-toggle">
                  <span>
                    <strong>Email notifications</strong>
                    <small>General account and product updates.</small>
                  </span>

                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(event) => setEmailNotifications(event.target.checked)}
                  />
                </label>

                <label className="settings-toggle">
                  <span>
                    <strong>Job alerts</strong>
                    <small>New jobs that match your profile.</small>
                  </span>

                  <input
                    type="checkbox"
                    checked={jobAlerts}
                    onChange={(event) => setJobAlerts(event.target.checked)}
                  />
                </label>

                <label className="settings-toggle">
                  <span>
                    <strong>Application updates</strong>
                    <small>Status changes on your applications.</small>
                  </span>

                  <input
                    type="checkbox"
                    checked={applicationUpdates}
                    onChange={(event) => setApplicationUpdates(event.target.checked)}
                  />
                </label>

                <label className="settings-toggle">
                  <span>
                    <strong>Interview reminders</strong>
                    <small>Reminders before scheduled interviews.</small>
                  </span>

                  <input
                    type="checkbox"
                    checked={interviewReminders}
                    onChange={(event) => setInterviewReminders(event.target.checked)}
                  />
                </label>
              </div>
            )}

            {active === "security" && (
              <div className="settings-section">
                <p className="card-label">SECURITY</p>

                <h2>Account security</h2>

                <p>
                  Manage your password and review how your data is used.
                </p>

                <div className="settings-grid">
                  <div className="settings-field">
                    <label>Current Password</label>
                    <input type="password" placeholder="••••••••" />
                  </div>

                  <div className="settings-field">
                    <label>New Password</label>
                    <input type="password" placeholder="••••••••" />
                  </div>
                </div>

                <div className="settings-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleChangePassword}
                  >
                    Change Password
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => void deleteAccount()}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting…" : "Delete Account"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
