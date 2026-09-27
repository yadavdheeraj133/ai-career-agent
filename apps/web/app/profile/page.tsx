"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ResumeViewer } from "@/components/resume-viewer";
import { apiRequest, ApiError, getToken, API_BASE_URL } from "@/lib/api";
import { mergeSkills } from "@/lib/profile-utils";
import { usePrimaryResume } from "@/lib/use-primary-resume";
import type { AuthUser } from "@/lib/types";
import "./profile.css";

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
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const primary = usePrimaryResume();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, skillsResponse] = await Promise.all([
          apiRequest<AuthUser>("/users/profile"),
          apiRequest<{ id: string; name: string }[]>("/api/skills").catch((caught) => {
            if (caught instanceof ApiError && caught.status === 404) return { data: [] };
            throw caught;
          }),
        ]);

        if (cancelled) return;

        setUser(profile.data);
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

  const resume = primary.document;
  const profileName = resume?.name ?? user?.name ?? "Your Profile";
  const profileEmail = resume?.email ?? user?.email ?? null;

  // Skills the user added on their profile are shown alongside the ones on the
  // resume; the resume itself stays the single source of truth.
  const view = resume
    ? { ...resume, skills: mergeSkills(userSkills, resume.skills) }
    : null;

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
    link.download = primary.meta?.originalFileName ?? "resume";
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
                    {resume.phone ? <span>{resume.phone}</span> : null}
                    {resume.location ? <span>{resume.location}</span> : null}
                  </div>

                  {(resume.currentRole || resume.targetRole) ? (
                    <div className="profile-role-list">
                      {resume.currentRole ? <span className="profile-role-chip">{resume.currentRole}</span> : null}
                      {resume.targetRole ? <span className="profile-role-chip">{resume.targetRole}</span> : null}
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
                    <h2 className="profile-resume-filename">
                      {primary.meta?.originalFileName ?? resume.title}
                    </h2>
                    <p className="profile-resume-meta">
                      Uploaded {formatDate(primary.meta?.uploadedAt)}
                    </p>
                  </div>

                  <div className="profile-actions">
                    {primary.meta?.hasOriginalFile ? (
                      <button type="button" className="profile-secondary-link" onClick={() => void downloadResume()}>
                        Download original
                      </button>
                    ) : null}
                    <Link href="/dashboard/resume/view" className="profile-secondary-link">
                      View resume
                    </Link>
                    <Link href="/dashboard/resume/upload" className="profile-primary-link">Replace Resume</Link>
                  </div>
                </div>
              </section>

              {/* The resume itself is rendered by the shared viewer, exactly as
                  it appears on the resume page and the dashboard preview. */}
              {view ? (
                <section className="profile-section profile-card">
                  <ResumeViewer resume={view} showActions={false} />
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
} 