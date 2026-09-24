"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import type {
  BookmarkList,
  Job,
  JobApplicationDetail,
  JobMatch,
  Resume,
} from "@/lib/types";
import "./jobDetail.css";

const overviewTabs = [
  { id: "overview", label: "Overview" },
  { id: "ats", label: "ATS" },
  { id: "resume-match", label: "Resume Match" },
  { id: "skill-gap", label: "Skill Gap" },
  { id: "verdict", label: "AI Verdict" },
  { id: "interview", label: "Interview" },
  { id: "actions", label: "Actions" },
];

interface MatchInfo {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

function verdictFor(score: number): string {
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Good Match";
  return "Fair Match";
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

async function loadApplicationStatus(
  jobId: string
): Promise<JobApplicationDetail["status"] | null> {
  try {
    const response = await apiRequest<JobApplicationDetail>(
      `/api/jobs/applications/${jobId}`
    );

    return response.data.status;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      return null;
    }

    throw caught;
  }
}

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();

  const jobId = Array.isArray(params.jobId)
    ? params.jobId[0]
    : params.jobId;

  const [tab, setTab] = useState("overview");

  const [job, setJob] = useState<Job | null>(null);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [saved, setSaved] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<
    JobApplicationDetail["status"]
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingJob, setSavingJob] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      setError("This job could not be found.");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [jobResponse, bookmarks, applicationStatusValue, skills] =
          await Promise.all([
            apiRequest<Job>(`/jobs/${jobId}`),
            apiRequest<BookmarkList>("/api/jobs/bookmarks"),
            loadApplicationStatus(jobId),
            loadResumeSkills(),
          ]);

        if (cancelled) return;

        setJob(jobResponse.data);
        setSaved(
          bookmarks.data.data.some((entry) => entry.jobId === jobResponse.data.id)
        );
        setApplicationStatus(applicationStatusValue);

        if (skills && skills.length > 0) {
          const matches = await apiRequest<JobMatch[]>("/api/jobs/match", {
            method: "POST",
            body: { skills },
          });

          if (cancelled) return;

          const result = matches.data.find(
            (entry) => entry.job.id === jobResponse.data.id
          );

          if (result) {
            setMatch({
              matchScore: result.matchScore,
              matchedSkills: result.matchedSkills,
              missingSkills: result.missingSkills,
            });
          }
        }
      } catch (caught) {
        if (cancelled) return;

        setError(
          caught instanceof ApiError && caught.status === 404
            ? "This job could not be found."
            : caught instanceof Error
              ? caught.message
              : "Unable to load this job."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const toggleSave = async () => {
    if (!job) return;

    setSavingJob(true);
    setNotice(null);

    try {
      await apiRequest(`/api/jobs/${job.id}/bookmark`, {
        method: saved ? "DELETE" : "POST",
      });
      setSaved((current) => !current);
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Unable to update bookmark."
      );
    } finally {
      setSavingJob(false);
    }
  };

  const applyNow = async () => {
    if (!job) return;

    setApplying(true);
    setNotice(null);

    try {
      const response = await apiRequest<{ status: string }>(
        "/api/jobs/applications",
        { method: "POST", body: { jobId: job.id, status: "Applied" } }
      );

      setApplicationStatus(response.data.status as JobApplicationDetail["status"]);
      setNotice("Application added to your tracker.");
    } catch (caught) {
      setNotice(
        caught instanceof Error ? caught.message : "Unable to apply right now."
      );
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <main className="feature-page job-detail-page">
        <div className="feature-container">
          <p className="form-notice">Loading job…</p>
        </div>
      </main>
    );
  }

  if (!job || error) {
    return (
      <main className="feature-page job-detail-page">
        <div className="feature-container">
          <header className="feature-header">
            <div>
              <Link href="/jobs/find" className="back-link">
                ← Jobs
              </Link>

              <p className="feature-eyebrow">JOB WORKSPACE</p>

              <h1>Job not available</h1>

              <p className="feature-description">
                This job may have been removed, or the link is incorrect.
              </p>
            </div>
          </header>

          {error ? <p className="inline-error">{error}</p> : null}

          <Link href="/jobs/find" className="primary-button">
            Back to jobs
            <span>→</span>
          </Link>
        </div>
      </main>
    );
  }

  const summary =
    job.description?.trim() ||
    "The source posting does not include a detailed description.";

  const totalSkills = match
    ? match.matchedSkills.length + match.missingSkills.length
    : 0;

  return (
    <main className="feature-page job-detail-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/jobs/find" className="back-link">
              ← Jobs
            </Link>

            <p className="feature-eyebrow">JOB WORKSPACE</p>

            <h1>{job.title}</h1>
          </div>

          <button
            type="button"
            className="apply-button"
            onClick={() => void applyNow()}
            disabled={applying}
          >
            {applicationStatus ? "Applied" : applying ? "Applying…" : "Apply Now"}
            <span>→</span>
          </button>
        </header>

        {notice ? <p className="form-notice">{notice}</p> : null}

        <section className="job-hero-card">
          <div className="job-hero-company">
            <div className="job-hero-mark">{initials(job.company)}</div>

            <div className="job-hero-info">
              <h2>{job.title}</h2>

              <p>
                {job.company} · {job.location} · {job.workMode} ·{" "}
                {job.jobType}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="workspace-save-button"
            onClick={() => void toggleSave()}
            disabled={savingJob}
          >
            {saved ? "Saved" : "Save Job"}
          </button>
        </section>

        <nav className="job-secondary-nav">
          {overviewTabs.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`job-nav-item ${
                tab === item.id ? "active" : ""
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <div className="job-tab-content">
            <section className="job-summary-card">
              <p className="card-label">JOB SUMMARY</p>

              <h2>About the role</h2>

              <p>{summary}</p>

              <div className="job-fact-grid">
                <div className="job-fact">
                  <span>Location</span>
                  <strong>{job.location}</strong>
                </div>

                <div className="job-fact">
                  <span>Work Mode</span>
                  <strong>{job.workMode}</strong>
                </div>

                <div className="job-fact">
                  <span>Job Type</span>
                  <strong>{job.jobType}</strong>
                </div>

                <div className="job-fact">
                  <span>Experience</span>
                  <strong>{job.experience ?? "Not specified"}</strong>
                </div>

                <div className="job-fact">
                  <span>Salary</span>
                  <strong>{job.salary ?? "Not disclosed"}</strong>
                </div>

                <div className="job-fact">
                  <span>Posted</span>
                  <strong>{formatDate(job.createdAt)}</strong>
                </div>
              </div>
            </section>

            <section className="job-detail-grid">
              <div className="job-detail-panel">
                <p className="card-label">POSTING DETAILS</p>

                <h2>Where this came from</h2>

                <ul className="check-list">
                  <li>✓ Source: {job.source}</li>
                  <li>
                    ✓ Experience: {job.experience ?? "Not specified"}
                  </li>
                  <li>
                    ✓ Job type: {job.jobType} · {job.workMode}
                  </li>
                </ul>

                {job.url ? (
                  <a
                    href={job.url}
                    className="secondary-button"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View original posting
                  </a>
                ) : null}
              </div>

              <div className="job-detail-panel">
                <p className="card-label">COMPENSATION</p>

                <h2>Salary</h2>

                <p className="salary-line">
                  {job.salary ?? "Salary was not shared by the source."}
                </p>

                <p>
                  Benefits and perks are listed on the original posting.
                </p>
              </div>
            </section>

            <section className="job-detail-grid">
              <div className="job-detail-panel">
                <p className="card-label">YOUR MATCHED SKILLS</p>

                <h2>What already fits</h2>

                {match && match.matchedSkills.length > 0 ? (
                  <div className="skill-tag-cloud">
                    {match.matchedSkills.map((skill) => (
                      <span className="required-skill" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>
                    Add skills to your profile to see which ones match this
                    role.
                  </p>
                )}
              </div>

              <div className="job-detail-panel">
                <p className="card-label">SKILLS TO HIGHLIGHT</p>

                <h2>Worth emphasising</h2>

                {match && match.missingSkills.length > 0 ? (
                  <div className="skill-tag-cloud">
                    {match.missingSkills.map((skill) => (
                      <span className="preferred-skill" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>
                    Your profile skills are not yet compared against this
                    job.
                  </p>
                )}
              </div>
            </section>

            <section className="ai-analysis-card">
              <div className="ai-analysis-icon">✦</div>

              <div className="ai-analysis-main">
                <p className="card-label">AI ANALYSIS</p>

                <h2>How you compare</h2>

                <div className="ai-analysis-scores">
                  <div className="ai-score">
                    <span>Resume Match</span>
                    <strong>
                      {match ? `${match.matchScore}%` : "—"}
                    </strong>
                  </div>

                  <div className="ai-score">
                    <span>ATS Score</span>
                    <strong>—</strong>
                  </div>

                  <div className="ai-score">
                    <span>AI Verdict</span>
                    <strong>
                      {match ? verdictFor(match.matchScore) : "Not analyzed"}
                    </strong>
                  </div>

                  <div className="ai-score">
                    <span>Interview Probability</span>
                    <strong>—</strong>
                  </div>
                </div>
              </div>

              <Link
                href="/features/ai-tools/verdict"
                className="secondary-button"
              >
                View Verdict
              </Link>
            </section>
          </div>
        )}

        {tab === "ats" && (
          <div className="job-tab-content">
            <section className="tab-panel">
              <p className="card-label">ATS SCORE</p>

              <h2>Resume compatibility</h2>

              <p>
                The AI scans the job posting against your resume to
                estimate how well it clears Applicant Tracking Systems.
              </p>

              <p className="form-notice">
                Run the ATS Analyzer to score your resume against this
                role.
              </p>

              <Link
                href="/features/resume/ats"
                className="secondary-button"
              >
                Open ATS Analyzer
              </Link>
            </section>
          </div>
        )}

        {tab === "resume-match" && (
          <div className="job-tab-content">
            <section className="tab-panel">
              <p className="card-label">RESUME MATCH</p>

              <h2>Skill-by-skill alignment</h2>

              <p>
                See which of your skills match the job requirements and
                which ones you could highlight more.
              </p>

              {match ? (
                <div className="tab-score-row">
                  <strong>{match.matchScore}%</strong>
                  <span>Match</span>
                </div>
              ) : (
                <p className="form-notice">
                  Add skills to your profile to see your match score.
                </p>
              )}

              <Link
                href="/features/resume/job-match"
                className="secondary-button"
              >
                Open Resume Match
              </Link>
            </section>
          </div>
        )}

        {tab === "skill-gap" && (
          <div className="job-tab-content">
            <section className="tab-panel">
              <p className="card-label">SKILL GAP</p>

              <h2>Closing the gap</h2>

              <p>
                The AI estimates how much of the required skills you
                already have and which ones to prioritize learning.
              </p>

              {match && totalSkills > 0 ? (
                <div className="tab-score-row">
                  <strong>
                    {Math.round(
                      (match.matchedSkills.length / totalSkills) * 100
                    )}
                    %
                  </strong>
                  <span>Existing skills</span>
                </div>
              ) : (
                <p className="form-notice">
                  Add skills to your profile to see your skill gap.
                </p>
              )}

              <Link
                href="/features/resume/skill-gap"
                className="secondary-button"
              >
                Open Skill Gap
              </Link>
            </section>
          </div>
        )}

        {tab === "verdict" && (
          <div className="job-tab-content">
            <section className="tab-panel">
              <p className="card-label">AI VERDICT</p>

              <h2>
                {match ? verdictFor(match.matchScore) : "Not analyzed yet"}
              </h2>

              <p>
                Overall recommendation based on your profile, skills,
                and the requirements of this role.
              </p>

              {match ? (
                <div className="verdict-banner">
                  <span className="verdict-dot" />
                  {verdictFor(match.matchScore)} for this role
                </div>
              ) : (
                <p className="form-notice">
                  Run the AI Verdict tool for a full recommendation.
                </p>
              )}

              <Link
                href="/features/ai-tools/verdict"
                className="secondary-button"
              >
                Open AI Verdict
              </Link>
            </section>
          </div>
        )}

        {tab === "interview" && (
          <div className="job-tab-content">
            <section className="tab-panel">
              <p className="card-label">INTERVIEW PROBABILITY</p>

              <h2>Your estimated chances</h2>

              <p>
                A model-based estimate of how likely you are to reach
                an interview, based on your profile and the job.
              </p>

              <p className="form-notice">
                Run Interview Probability to estimate your chances for
                this role.
              </p>

              <div className="tab-panel-actions">
                <Link
                  href="/features/interview"
                  className="primary-button"
                >
                  Prepare Interview
                  <span>→</span>
                </Link>

                <Link
                  href="/features/ai-tools/interview-probability"
                  className="secondary-button"
                >
                  Details
                </Link>
              </div>
            </section>
          </div>
        )}

        {tab === "actions" && (
          <div className="job-tab-content">
            <section className="tab-panel">
              <p className="card-label">APPLICATION ACTIONS</p>

              <h2>Tools for applying</h2>

              <p>
                Prepare everything you need to submit a strong
                application for this role.
              </p>

              <div className="action-tool-grid">
                <Link
                  href="/features/resume/tailor"
                  className="action-tool"
                >
                  <strong>Resume Tailor</strong>
                  <span>Align your resume to this job.</span>
                </Link>

                <Link
                  href="/features/applications/cover-letter"
                  className="action-tool"
                >
                  <strong>Cover Letter</strong>
                  <span>Generate a tailored cover letter.</span>
                </Link>

                <Link
                  href="/features/applications/answers"
                  className="action-tool"
                >
                  <strong>Application Answers</strong>
                  <span>Draft answers for screening forms.</span>
                </Link>

                <Link
                  href="/features/applications/message"
                  className="action-tool"
                >
                  <strong>Recruiter Message</strong>
                  <span>Write a professional outreach message.</span>
                </Link>

                <Link
                  href="/features/interview"
                  className="action-tool"
                >
                  <strong>Interview Prep</strong>
                  <span>Practice for the interview stage.</span>
                </Link>
              </div>
            </section>
          </div>
        )}

        <section className="job-bottom-actions">
          <div>
            <p className="card-label">NEXT STEP</p>

            <h2>Ready to apply?</h2>

            <p>
              {applicationStatus
                ? `You have already tracked this job as "${applicationStatus}".`
                : "You can apply at any stage of the workspace. Prepare your materials first for the best result."}
            </p>
          </div>

          <div className="action-buttons">
            <Link
              href="/features/applications/cover-letter"
              className="secondary-button"
            >
              Cover Letter
            </Link>

            <button
              type="button"
              className="primary-button"
              onClick={() => void applyNow()}
              disabled={applying}
            >
              {applicationStatus ? "Applied" : applying ? "Applying…" : "Apply Now"}
              <span>→</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
