"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest, ApiError, getToken } from "@/lib/api";
import type { AuthUser, ParsedResumeProfile, Resume } from "@/lib/types";
import "./profile.css";

function values(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [profile, resumeResponse] = await Promise.all([
          apiRequest<AuthUser>("/users/profile"),
          apiRequest<Resume>("/resume").catch((caught) => {
            if (caught instanceof ApiError && caught.status === 404) return null;
            throw caught;
          }),
        ]);
        if (cancelled) return;
        setUser(profile.data);
        setResume(resumeResponse?.data ?? null);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load your profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const parsed = (resume?.parsedProfile ?? null) as ParsedResumeProfile | null;

  async function downloadResume() {
    const response = await fetch("http://localhost:5000/resume/file", {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    });
    if (!response.ok) throw new Error("Unable to download your resume.");
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
        <Link href="/dashboard" className="profile-back-link">← Dashboard</Link>
        <p className="feature-eyebrow">CAREER PROFILE</p>
        <h1>Career Profile</h1>
        <p className="feature-description">Information extracted from your uploaded resume.</p>

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
            <section className="profile-card profile-summary-card">
              <div>
                <p className="card-label">PROFILE</p>
                <h2>{parsed?.name ?? user?.name ?? "Your Profile"}</h2>
                <p>{parsed?.email ?? user?.email ?? ""}</p>
                {parsed?.currentRole ? <span>{parsed.currentRole}</span> : null}
              </div>
              {user?.avatarUrl ? (
                // Profile URLs are user-provided and may be hosted externally.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="Profile" />
              ) : null}
            </section>

            <section className="profile-card">
              <p className="card-label">RESUME</p>
              <h2>{resume.originalFileName ?? resume.title}</h2>
              <p>Uploaded {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : "date unavailable"}</p>
              <div className="profile-actions">
                <button type="button" className="profile-secondary-link" onClick={() => void downloadResume()}>View / download resume</button>
                <Link href="/dashboard/resume/upload" className="profile-primary-link">Replace Resume</Link>
              </div>
            </section>

            <section className="profile-grid">
              {[
                ["Contact", [parsed?.phone, parsed?.location].filter(Boolean) as string[]],
                ["Roles", [parsed?.currentRole, parsed?.targetRole].filter(Boolean) as string[]],
                ["Summary", parsed?.summary ? [parsed.summary] : []],
                ["Skills", values(parsed?.skills)],
                ["Education", values(parsed?.education)],
                ["Work Experience", values(parsed?.experience)],
                ["Projects", values(parsed?.projects)],
                ["Certifications", values(parsed?.certifications)],
                ["Achievements", values(parsed?.achievements)],
              ].map(([title, items]) => (
                <section className="profile-card profile-detail" key={title as string}>
                  <p className="card-label">{title as string}</p>
                  {(items as string[]).length ? (items as string[]).map((item) => <p key={item}>{item}</p>) : <p className="profile-muted">Not found in the resume.</p>}
                </section>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}