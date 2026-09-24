"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest, ApiError, getToken, API_BASE_URL } from "@/lib/api";
import { asStringList, mergeSkills, normalizeResumeText } from "@/lib/profile-utils";
import type { AuthUser, ParsedResumeProfile, Resume } from "@/lib/types";
import "./profile.css";

function getProjectUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s<>"]+/i);
  return match ? match[0].replace(/[),.;]+$/, "") : null;
}

function parseProjectEntry(value: string) {
  const cleaned = normalizeResumeText(value);
  const url = getProjectUrl(cleaned);
  const withoutUrl = url ? cleaned.replace(url, "").replace(/\bGitHub\b\s*[:>-]?\s*$/i, "").trim() : cleaned;
  const stripped = withoutUrl.replace(/\s*[|/\\]\s*$/, "").trim();

  const dateMatch = stripped.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4}\s*[–-]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})|\d{4}/i);

  let name = stripped;
  let date: string | null = null;
  let description = "";

  if (dateMatch) {
    date = dateMatch[0].trim();
    const index = stripped.indexOf(dateMatch[0]);
    const beforeDate = stripped.slice(0, index).trim();
    const afterDate = stripped.slice(index + dateMatch[0].length).trim();

    name = beforeDate || stripped;
    description = afterDate.replace(/^[\s\-–—:|/\\]+/, "").trim();
  }

  if (!name || name === description) {
    const firstSentence = stripped.split(/\s{2,}|\n+/).filter(Boolean)[0] ?? stripped;
    name = firstSentence.trim();
    description = stripped.replace(firstSentence, "").replace(/^[\s\-–—:|/\\]+/, "").trim();
  }

  if (!name || name.length < 2) {
    name = "Project";
  }

  return {
    name: name || "Project",
    date,
    description: description || "",
    url,
  };
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "date unavailable";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, resumeResponse, skillsResponse] = await Promise.all([
          apiRequest<AuthUser>("/users/profile"),
          apiRequest<Resume>("/resume").catch((caught) => {
            if (caught instanceof ApiError && caught.status === 404) return null;
            throw caught;
          }),
          apiRequest<{ id: string; name: string }[]>("/api/skills").catch((caught) => {
            if (caught instanceof ApiError && caught.status === 404) return { data: [] };
            throw caught;
          }),
        ]);

        if (cancelled) return;

        setUser(profile.data);
        setResume(resumeResponse?.data ?? null);
        setUserSkills((skillsResponse?.data ?? []).map((skill) => skill.name));
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const parsed = (resume?.parsedProfile ?? null) as ParsedResumeProfile | null;
  const profileName = parsed?.name ?? user?.name ?? "Your Profile";
  const profileEmail = parsed?.email ?? user?.email ?? null;
  const summaryText = parsed?.summary?.trim();
  const finalSkills = mergeSkills(userSkills, asStringList(parsed?.skills));

  const experienceItems = asStringList(parsed?.experience);
  const educationItems = asStringList(parsed?.education);
  const projectItems = asStringList(parsed?.projects).map((item) => parseProjectEntry(item));
  const certificationItems = asStringList(parsed?.certifications);
  const achievementItems = asStringList(parsed?.achievements);

  async function downloadResume() {
    const response = await fetch(`${API_BASE_URL}/resume/file`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    });

    if (!response.ok) {
      throw new Error("Unable to download your resume.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = resume?.originalFileName ?? "resume";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="feature-page profile-page">
      <div className="feature-container">
        <div className="profile-shell">
          <Link href="/dashboard" className="profile-back-link">← Dashboard</Link>

          {loading ? <p className="profile-state">Loading your profile…</p> : null}
          {error ? <p className="profile-state profile-error">{error}</p> : null}

          {!loading && !error && !resume ? (
            <section className="profile-empty profile-card">
              <h2>No resume uploaded yet</h2>
              <p>Upload your resume to build your career profile.</p>
              <Link href="/dashboard/resume/upload" className="profile-primary-link">Upload Resume</Link>
            </section>
          ) : null}

          {!loading && !error && resume ? (
            <>
              <header className="profile-header profile-card">
                <div className="profile-header-content">
                  <p className="profile-eyebrow">PROFILE</p>
                  <h1>{profileName}</h1>

                  <div className="profile-meta-list">
                    {profileEmail ? <span>{profileEmail}</span> : null}
                    {parsed?.phone ? <span>{parsed.phone}</span> : null}
                    {parsed?.location ? <span>{parsed.location}</span> : null}
                  </div>

                  {(parsed?.currentRole || parsed?.targetRole) ? (
                    <div className="profile-role-list">
                      {parsed?.currentRole ? <span className="profile-role-chip">{parsed.currentRole}</span> : null}
                      {parsed?.targetRole ? <span className="profile-role-chip">{parsed.targetRole}</span> : null}
                    </div>
                  ) : null}
                </div>

                {user?.avatarUrl ? (
                  // Profile URLs are user-provided and may be hosted externally.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="Profile" className="profile-avatar" />
                ) : null}
              </header>

              <section className="profile-section profile-card">
                <p className="profile-section-label">Current Resume</p>
                <div className="profile-resume-row">
                  <div>
                    <h2 className="profile-resume-filename">{resume.originalFileName ?? resume.title}</h2>
                    <p className="profile-resume-meta">Uploaded {formatDate(resume.uploadedAt)}</p>
                  </div>

                  <div className="profile-actions">
                    <button type="button" className="profile-secondary-link" onClick={() => void downloadResume()}>
                      View / Download Resume
                    </button>
                    <Link href="/dashboard/resume/upload" className="profile-primary-link">Replace Resume</Link>
                  </div>
                </div>
              </section>

              {summaryText ? (
                <section className="profile-section profile-card">
                  <p className="profile-section-label">Professional Summary</p>
                  <p className="profile-summary-text">{summaryText}</p>
                </section>
              ) : null}

              {finalSkills.length ? (
                <section className="profile-section profile-card">
                  <p className="profile-section-label">Skills</p>
                  <div className="profile-skill-list">
                    {finalSkills.map((skill) => (
                      <span key={skill} className="profile-skill-pill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {experienceItems.length ? (
                <section className="profile-section profile-card">
                  <p className="profile-section-label">Work Experience</p>
                  <ul className="profile-list">
                    {experienceItems.map((item) => (
                      <li key={item} className="profile-entry">
                        <p className="profile-entry-body">{item}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {educationItems.length ? (
                <section className="profile-section profile-card">
                  <p className="profile-section-label">Education</p>
                  <ul className="profile-list">
                    {educationItems.map((item) => (
                      <li key={item} className="profile-entry">
                        <p className="profile-entry-body">{item}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {projectItems.length ? (
                <section className="profile-section profile-card">
                  <p className="profile-section-label">Projects</p>
                  <div className="profile-project-list">
                    {projectItems.map((project, index) => (
                      <article key={`${project.name}-${index}`} className="profile-project-card">
                        <div className="profile-project-header">
                          <h3>{project.name}</h3>
                          {project.date ? <span>{project.date}</span> : null}
                        </div>

                        {project.description ? (
                          <p className="profile-project-description">{project.description}</p>
                        ) : null}

                        {project.url ? (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="profile-project-link"
                          >
                            GitHub →
                          </a>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}

              {certificationItems.length ? (
                <section className="profile-section profile-card">
                  <p className="profile-section-label">Certifications</p>
                  <ul className="profile-list compact-list">
                    {certificationItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {achievementItems.length ? (
                <section className="profile-section profile-card">
                  <p className="profile-section-label">Achievements</p>
                  <ul className="profile-list compact-list">
                    {achievementItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
} 