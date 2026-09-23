"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "@/lib/api";
import { formatRelativeTime, initials } from "@/lib/format";
import type { BookmarkList, JobMatch, Resume } from "@/lib/types";
import "./savedJobs.css";

interface SavedJobCard {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  jobType: string;
  tags: string[];
  match: number | null;
  savedAt: string;
}

async function loadResumeSkills(): Promise<string[] | null> {
  try {
    const response = await apiRequest<Resume>("/resume");

    return Array.isArray(response.data.skills)
      ? response.data.skills.filter(
          (skill): skill is string => typeof skill === "string"
        )
      : [];
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      return null;
    }

    throw caught;
  }
}

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<SavedJobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [bookmarks, skills] = await Promise.all([
          apiRequest<BookmarkList>("/api/jobs/bookmarks"),
          loadResumeSkills(),
        ]);

        if (cancelled) return;

        const scores: Record<string, { matchScore: number; matchedSkills: string[] }> =
          {};

        if (skills && skills.length > 0) {
          const matches = await apiRequest<JobMatch[]>("/api/jobs/match", {
            method: "POST",
            body: { skills },
          });

          if (cancelled) return;

          for (const match of matches.data) {
            scores[match.job.id] = {
              matchScore: match.matchScore,
              matchedSkills: match.matchedSkills,
            };
          }
        }

        setJobs(
          bookmarks.data.data.map((entry) => {
            const score = scores[entry.jobId];

            return {
              id: entry.jobId,
              title: entry.job.title,
              company: entry.job.company,
              location: entry.job.location,
              workMode: entry.job.workMode,
              jobType: entry.job.jobType,
              tags:
                score && score.matchedSkills.length > 0
                  ? score.matchedSkills.slice(0, 3)
                  : [entry.job.source],
              match: score ? score.matchScore : null,
              savedAt: formatRelativeTime(entry.bookmarkedAt),
            };
          })
        );
      } catch (caught) {
        if (cancelled) return;

        setError(
          caught instanceof Error ? caught.message : "Unable to load saved jobs."
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

  const removeJob = async (jobId: string) => {
    setRemovingId(jobId);
    setError(null);

    try {
      await apiRequest(`/api/jobs/${jobId}/bookmark`, { method: "DELETE" });
      setJobs((current) => current.filter((job) => job.id !== jobId));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to remove this job."
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <main className="feature-page saved-jobs-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/jobs/find" className="back-link">
              ← Find Jobs
            </Link>

            <p className="feature-eyebrow">YOUR JOB LIST</p>

            <h1>Saved Jobs</h1>

            <p className="feature-description">
              Jobs you have bookmarked to review later. Saved jobs stay
              private to your account until you remove them.
            </p>
          </div>

          <Link href="/jobs/find" className="secondary-button">
            Find More Jobs
          </Link>
        </header>

        {error ? <p className="inline-error">{error}</p> : null}

        {loading ? (
          <p className="form-notice">Loading saved jobs…</p>
        ) : jobs.length > 0 ? (
          <section className="saved-list-section">
            <div className="section-header">
              <div>
                <p className="card-label">BOOKMARKED</p>

                <h2>
                  {jobs.length} saved job{jobs.length === 1 ? "" : "s"}
                </h2>
              </div>

              <span className="section-count">
                {jobs.length} listed
              </span>
            </div>

            <div className="saved-job-list">
              {jobs.map((job) => (
                <article className="saved-job-card" key={job.id}>
                  <div className="saved-job-main">
                    <div className="saved-job-mark">
                      {initials(job.company)}
                    </div>

                    <div className="saved-job-info">
                      <div className="saved-job-title-row">
                        <h3>{job.title}</h3>

                        {job.match !== null ? (
                          <span className="match-badge">
                            {job.match}% Match
                          </span>
                        ) : null}
                      </div>

                      <p className="saved-job-company">{job.company}</p>

                      <p className="saved-job-meta">
                        {job.location} · {job.workMode} · {job.jobType}
                      </p>

                      <div className="saved-skill-tags">
                        {job.tags.map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="saved-job-footer">
                    <span className="saved-at">
                      Saved {job.savedAt}
                    </span>

                    <div className="saved-job-actions">
                      <button
                        type="button"
                        className="remove-job-button"
                        onClick={() => void removeJob(job.id)}
                        disabled={removingId === job.id}
                      >
                        Remove
                      </button>

                      <Link
                        href={`/jobs/${job.id}`}
                        className="view-job-button"
                      >
                        View Job
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="saved-empty-state">
            <div className="saved-empty-icon">◫</div>

            <h2>No saved jobs yet</h2>

            <p>
              When you find a job you like, save it here so you can
              review it later before applying.
            </p>

            <Link href="/jobs/find" className="primary-button">
              Explore Jobs
              <span>→</span>
            </Link>
          </section>
        )}

        <section className="saved-job-tip">
          <div className="tip-icon">✦</div>

          <div>
            <p className="card-label">AI CAREER INSIGHT</p>

            <h2>Check saved jobs while your profile is fresh</h2>

            <p>
              Your skills and preferences update over time. Revisit
              saved jobs once a week to keep your top picks accurate.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
