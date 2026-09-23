"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./careerHub.css";

import { apiRequest, ApiError } from "@/lib/api";
import type { UserPreferences } from "@/lib/types";

const workModeOptions = ["Remote", "Hybrid", "Onsite"];
const jobTypeOptions = ["Full-time", "Part-time", "Internship", "Contract", "Freelance"];
const experienceOptions = ["0–1 years", "1–3 years", "3–5 years", "5+ years"];

const careerTools = [
  {
    href: "/features/career/coach",
    icon: "✦",
    title: "Career Coach",
    description: "Talk through your career direction and next moves.",
  },
  {
    href: "/features/career/roadmap",
    icon: "↗",
    title: "Career Roadmap",
    description: "See the staged path from where you are to your goal.",
  },
  {
    href: "/features/career/learning-path",
    icon: "◈",
    title: "Learning Path",
    description: "A structured list of skills to learn for your target role.",
  },
];

export default function CareerHubPage() {
  const [jobRole, setJobRole] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [workMode, setWorkMode] = useState("Remote");
  const [jobType, setJobType] = useState("Full-time");

  const [hasPreferences, setHasPreferences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await apiRequest<UserPreferences>("/api/preferences");

        if (cancelled) return;

        const preferences = response.data;
        setHasPreferences(true);
        setJobRole(preferences.jobRole ?? "");
        setLocation(preferences.location ?? "");
        setSalary(preferences.salary ?? "");
        if (preferences.workMode) setWorkMode(preferences.workMode);
        if (preferences.jobType) setJobType(preferences.jobType);
      } catch (caught) {
        if (cancelled) return;

        if (caught instanceof ApiError && caught.status === 404) {
          setHasPreferences(false);
        } else {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load your preferences."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveProfile() {
    setError(null);
    setSaving(true);

    const body = {
      jobRole: jobRole.trim(),
      location: location.trim(),
      workMode,
      jobType,
      salary: salary.trim(),
    };

    try {
      if (hasPreferences) {
        await apiRequest<UserPreferences>("/api/preferences", {
          method: "PATCH",
          body,
        });
      } else {
        await apiRequest<UserPreferences>("/api/preferences", {
          method: "POST",
          body,
        });
        setHasPreferences(true);
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save your preferences."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="feature-page career-hub-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">CAREER PROFILE</p>

            <h1>Career</h1>

            <p className="feature-description">
              Keep your career preferences up to date. These drive every
              match score, prediction and recommendation the agent makes.
            </p>
          </div>
        </header>

        <section className="career-profile-card">
          <p className="card-label">CAREER PROFILE</p>

          <h2>What are you targeting?</h2>

          <form
            className="career-profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile();
            }}
          >
            <div className="career-field-grid">
              <div className="career-field">
                <label>Target Role</label>

                <input
                  type="text"
                  placeholder="Full Stack Developer"
                  value={jobRole}
                  onChange={(event) => setJobRole(event.target.value)}
                />
              </div>

              <div className="career-field">
                <label>Experience</label>

                <select defaultValue="0–1 years">
                  {experienceOptions.map((option) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="career-field">
                <label>Preferred Location</label>

                <input
                  type="text"
                  placeholder="Mumbai"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </div>

              <div className="career-field">
                <label>Expected Salary (per year)</label>

                <input
                  type="text"
                  placeholder="₹12,00,000"
                  value={salary}
                  onChange={(event) => setSalary(event.target.value)}
                />
              </div>
            </div>

            <div className="career-choice-row">
              <div>
                <label>Work Mode</label>

                <div className="choice-group">
                  {workModeOptions.map((option) => (
                    <button
                      type="button"
                      className={`choice-pill ${
                        workMode === option ? "active" : ""
                      }`}
                      key={option}
                      onClick={() => setWorkMode(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label>Job Type</label>

                <div className="choice-group">
                  {jobTypeOptions.map((option) => (
                    <button
                      type="button"
                      className={`choice-pill ${
                        jobType === option ? "active" : ""
                      }`}
                      key={option}
                      onClick={() => setJobType(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="career-form-actions">
              <button type="submit" className="primary-button" disabled={saving || loading}>
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
              </button>

              <span className="career-form-note">
                Career preferences affect matches and AI recommendations.
              </span>
            </div>
          </form>
        </section>

        <section className="career-tools-section">
          <div className="section-header">
            <div>
              <p className="card-label">AI CAREER TOOLS</p>

              <h2>Grow your career</h2>
            </div>

            <span className="section-count">3 tools</span>
          </div>

          <div className="career-tool-grid">
            {careerTools.map((tool) => (
              <Link href={tool.href} className="career-tool-card" key={tool.title}>
                <span className="career-tool-icon">{tool.icon}</span>

                <span className="career-tool-content">
                  <h3>{tool.title}</h3>

                  <p>{tool.description}</p>
                </span>

                <span className="career-tool-arrow">→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
