"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "@/lib/api";
import { initials } from "@/lib/format";
import type { BookmarkList, Job, JobMatch } from "@/lib/types";
import "./jobsFind.css";

const PAGE_SIZE = 50;

const workModes = ["Remote", "Hybrid", "Onsite"];
const jobTypes = ["Full-time", "Part-time", "Contract", "Internship"];
const experienceLevels = ["0-1 years", "1-3 years", "3-5 years", "5+ years"];

interface JobScore {
  matchScore: number;
  matchedSkills: string[];
}

interface FindFilters {
  role: string;
  location: string;
  workMode: string;
  jobType: string;
  experience: string;
}

const EMPTY_FILTERS: FindFilters = {
  role: "",
  location: "",
  workMode: "",
  jobType: "",
  experience: "",
};

export default function FindJobsPage() {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [jobType, setJobType] = useState("");
  const [experience, setExperience] = useState("");

  const [activeFilters, setActiveFilters] =
    useState<FindFilters>(EMPTY_FILTERS);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [scores, setScores] = useState<Record<string, JobScore>>({});
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = async (
    filters: FindFilters,
    page: number,
    replace: boolean
  ) => {
    const response = await apiRequest<JobMatch[]>("/api/jobs/match", {
      method: "POST",
      body: {
        page,
        pageSize: PAGE_SIZE,
        keyword: filters.role.trim() || undefined,
        location: filters.location.trim() || undefined,
        workMode: filters.workMode || undefined,
        jobType: filters.jobType || undefined,
        experience: filters.experience || undefined,
      },
    });

    const pageMatches = response.data ?? [];

    setTotal(response.total ?? 0);
    setTotalPages(response.totalPages ?? 0);
    setCurrentPage(page);

    setJobs((current) => {
      const merged = replace ? [] : [...current];
      const seen = new Set(merged.map((job) => job.id));
      for (const match of pageMatches) {
        if (!seen.has(match.job.id)) {
          seen.add(match.job.id);
          merged.push(match.job);
        }
      }
      return merged;
    });

    setScores((current) => {
      const next = { ...current };
      for (const match of pageMatches) {
        next[match.job.id] = {
          matchScore: match.matchScore,
          matchedSkills: match.matchedSkills,
        };
      }
      return next;
    });
  };

  const runSearch = async (filters: FindFilters) => {
    setLoading(true);
    setError(null);
    setActiveFilters(filters);

    try {
      await fetchPage(filters, 1, true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to search jobs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const bookmarks = await apiRequest<BookmarkList>("/api/jobs/bookmarks");

        if (cancelled) return;

        setSavedJobs(bookmarks.data.data.map((entry) => entry.jobId));

        const response = await apiRequest<JobMatch[]>("/api/jobs/match", {
          method: "POST",
          body: { page: 1, pageSize: PAGE_SIZE },
        });

        if (cancelled) return;

        setTotal(response.total ?? 0);
        setTotalPages(response.totalPages ?? 0);
        setCurrentPage(1);

        const nextScores: Record<string, JobScore> = {};
        for (const match of response.data ?? []) {
          nextScores[match.job.id] = {
            matchScore: match.matchScore,
            matchedSkills: match.matchedSkills,
          };
        }
        setScores(nextScores);
        setJobs((response.data ?? []).map((match) => match.job));
      } catch (caught) {
        if (cancelled) return;

        setError(
          caught instanceof ApiError && caught.status === 400
            ? "Add your skills to unlock job matching."
            : caught instanceof Error
              ? caught.message
              : "Unable to load jobs."
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

  const loadMore = async () => {
    if (loadingMore || currentPage >= totalPages) return;

    setLoadingMore(true);
    setError(null);

    try {
      await fetchPage(activeFilters, currentPage + 1, false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load more jobs."
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSave = async (jobId: string) => {
    const isSaved = savedJobs.includes(jobId);
    setSavingId(jobId);
    setError(null);

    try {
      await apiRequest(`/api/jobs/${jobId}/bookmark`, {
        method: isSaved ? "DELETE" : "POST",
      });

      setSavedJobs((current) =>
        isSaved
          ? current.filter((id) => id !== jobId)
          : [...current, jobId]
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update bookmark."
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSearched(true);
    void runSearch({
      role,
      location,
      workMode,
      jobType,
      experience,
    });
  };

  const hasActiveFilters =
    role.trim() !== "" ||
    location.trim() !== "" ||
    workMode !== "" ||
    jobType !== "" ||
    experience !== "";

  const filtersActive = hasActiveFilters || searched;

  const visibleJobs = jobs.filter((job) => {
    if (
      role.trim() !== "" &&
      !job.title.toLowerCase().includes(role.trim().toLowerCase()) &&
      !job.company.toLowerCase().includes(role.trim().toLowerCase())
    ) {
      return false;
    }

    if (
      location.trim() !== "" &&
      !job.location.toLowerCase().includes(location.trim().toLowerCase())
    ) {
      return false;
    }

    if (workMode !== "" && job.workMode !== workMode) {
      return false;
    }

    if (jobType !== "" && job.jobType !== jobType) {
      return false;
    }

    if (experience !== "") {
      const label = experience.replace(/\s*years?/i, "").trim();
      if (!(job.experience ?? "").toLowerCase().includes(label)) {
        return false;
      }
    }

    return true;
  });

  const hasMore = currentPage < totalPages;

  return (
    <main className="feature-page jobs-find-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">JOB DISCOVERY</p>

            <h1>Find Jobs</h1>

            <p className="feature-description">
              Search jobs that match your profile, filter by your
              preferences, and explore the ones that fit best.
            </p>
          </div>

          <Link href="/jobs/saved" className="secondary-button">
            Saved Jobs
          </Link>
        </header>

        <section className="job-search-card">
          <form className="job-search-form" onSubmit={handleSubmit}>
            <div className="job-search-field">
              <label htmlFor="job-role">Role</label>
              <input
                id="job-role"
                type="text"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Full Stack Developer"
              />
            </div>

            <div className="job-search-field">
              <label htmlFor="job-location">Location</label>
              <input
                id="job-location"
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Mumbai"
              />
            </div>

            <div className="job-search-field">
              <label htmlFor="job-work-mode">Work Mode</label>
              <select
                id="job-work-mode"
                value={workMode}
                onChange={(event) => setWorkMode(event.target.value)}
              >
                <option value="">Any</option>
                {workModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div className="job-search-field">
              <label htmlFor="job-type">Job Type</label>
              <select
                id="job-type"
                value={jobType}
                onChange={(event) => setJobType(event.target.value)}
              >
                <option value="">Any</option>
                {jobTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="job-search-field">
              <label htmlFor="job-experience">Experience</label>
              <select
                id="job-experience"
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
              >
                <option value="">Any</option>
                {experienceLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="search-submit-button"
              disabled={loading}
            >
              {loading ? "Searching…" : "Find Jobs"}
              <span>→</span>
            </button>
          </form>
        </section>

        <section className="job-list-section">
          <div className="section-header">
            <div>
              <p className="card-label">MATCHED FOR YOU</p>

              <h2>
                {filtersActive
                  ? visibleJobs.length > 0
                    ? `${visibleJobs.length} job${
                        visibleJobs.length === 1 ? "" : "s"
                      } found`
                    : "No jobs found"
                  : "Recommended jobs"}
              </h2>
            </div>

            <span className="section-count">
              {visibleJobs.length} listed
            </span>
          </div>

          {error ? <p className="inline-error">{error}</p> : null}

          {loading && jobs.length === 0 ? (
            <p className="form-notice">Loading jobs…</p>
          ) : visibleJobs.length > 0 ? (
            <div className="job-card-list">
              {visibleJobs.map((job) => {
                const isSaved = savedJobs.includes(job.id);
                const score = scores[job.id];
                const tags =
                  score && score.matchedSkills.length > 0
                    ? score.matchedSkills.slice(0, 3)
                    : [job.source];

                return (
                  <article className="job-result-card" key={job.id}>
                    <div className="job-result-main">
                      <div className="job-company-mark">
                        {initials(job.company)}
                      </div>

                      <div className="job-result-info">
                        <h3>{job.title}</h3>

                        <p className="job-company">{job.company}</p>

                        <p className="job-meta">
                          {job.location} · {job.workMode} · {job.jobType}
                        </p>

                        <div className="job-skill-tags">
                          {tags.map((skill) => (
                            <span key={skill}>{skill}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="job-match-score">
                      <strong>
                        {score ? `${score.matchScore}%` : "—"}
                      </strong>
                      <span>Match</span>
                    </div>

                    <div className="job-result-actions">
                      <button
                        type="button"
                        className={`save-job-button ${
                          isSaved ? "saved" : ""
                        }`}
                        onClick={() => void toggleSave(job.id)}
                        disabled={savingId === job.id}
                      >
                        {isSaved ? "Saved" : "Save"}
                      </button>

                      <Link
                        href={`/jobs/${job.id}`}
                        className="view-job-button"
                      >
                        View Job
                        <span>→</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            !loading && (
              <div className="job-empty-state">
                <div className="empty-state-icon">⌕</div>

                <h3>No matching jobs yet</h3>

                <p>
                  {total === 0
                    ? "Add your skills and job preferences to start receiving matches."
                    : "Try adjusting your filters or searching for a more general role."}
                </p>
              </div>
            )
          )}

          {hasMore ? (
            <div className="load-more-wrap">
              <button
                type="button"
                className="load-more-button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore
                  ? "Loading…"
                  : `Load more (${total - jobs.length} remaining)`}
              </button>
            </div>
          ) : null}
        </section>

        <section className="job-insight-card">
          <div className="insight-icon">✦</div>

          <div>
            <p className="card-label">AI CAREER INSIGHT</p>

            <h2>
              Roles matching your skills usually rank highest
            </h2>

            <p>
              Jobs that share keywords with your current skills get a
              higher match score. Keep your resume&apos;s skill list updated
              for better recommendations.
            </p>
          </div>

          <Link
            href="/features/resume/job-match"
            className="secondary-button"
          >
            Resume Match
          </Link>
        </section>
      </div>
    </main>
  );
}