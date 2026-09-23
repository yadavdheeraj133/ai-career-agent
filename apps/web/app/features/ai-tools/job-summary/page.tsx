"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction } from "@/lib/use-ai";
import type { JobSummaryResult } from "@/lib/types";

import "./jobSummary.css";

export default function JobSummaryPage() {
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<JobSummaryResult>();

  const result = action.data;
  const canRun =
    jobDescription.trim().length > 0 && !action.loading;

  return (
    <main className="feature-page job-summary-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI JOB INTELLIGENCE</p>

            <h1>Job Summary</h1>

            <p className="feature-description">
              Understand a job description quickly with an AI-generated
              summary of the role, responsibilities, requirements, and
              technologies.
            </p>
          </div>

          <Link href="/features/resume/job-match" className="secondary-button">
            Match My Resume
          </Link>
        </header>

        <AiToolPanel
          eyebrow="JOB DESCRIPTION"
          title="Summarize a job posting"
          description="Paste a job description and AI will extract the important details."
          fields={[
            {
              id: "jobDescription",
              label: "Job Description",
              value: jobDescription,
              onChange: setJobDescription,
              rows: 10,
              placeholder: "Paste the job description here…",
            },
          ]}
          submitLabel="Summarize Job"
          onSubmit={() =>
            action.run("/api/interview/job-summary", { jobDescription })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Summarizing the job posting…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No summary yet"
            description="Paste a job description and generate a clear summary of the role, requirements, and tech stack."
          />
        ) : null}

        {result ? (
          <>
            <section className="job-overview-card">
              <div className="company-mark">
                {(result.company || "JB").slice(0, 2).toUpperCase()}
              </div>

              <div className="job-overview-main">
                <p className="card-label">JOB OVERVIEW</p>

                <h2>{result.jobTitle}</h2>

                <p className="company-line">
                  {[result.company, result.location, result.employmentType]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <div className="job-meta">
                  <span>{result.experienceLevel}</span>
                  {result.salary ? (
                    <>
                      <span>·</span>
                      <span>{result.salary}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <span className="summary-badge">AI Summarized</span>
            </section>

            <section className="ai-summary-card">
              <div className="summary-heading">
                <div className="summary-icon">✦</div>

                <div>
                  <p className="card-label">AI SUMMARY</p>

                  <h2>What this job is really about</h2>
                </div>
              </div>

              <p className="ai-summary-text">{result.summary}</p>

              {result.qualifications.length > 0 ? (
                <div className="summary-highlights">
                  {result.qualifications.slice(0, 3).map((item, index) => (
                    <div key={item}>
                      <span className="highlight-icon">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div>
                        <strong>{item}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="summary-grid">
              <div className="summary-section-card">
                <div className="section-title">
                  <span className="title-dot requirement" />

                  <div>
                    <p className="card-label">SKILLS</p>

                    <h2>What they are looking for</h2>
                  </div>
                </div>

                <ul className="summary-list">
                  {[...result.requiredSkills].map((item) => (
                    <li key={item}>
                      <span>✓</span>
                      <p>{item}</p>
                    </li>
                  ))}

                  {result.requiredSkills.length === 0 ? (
                    <li>
                      <span>✓</span>
                      <p>No specific skills were listed.</p>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="summary-section-card">
                <div className="section-title">
                  <span className="title-dot responsibility" />

                  <div>
                    <p className="card-label">RESPONSIBILITIES</p>

                    <h2>What you will do</h2>
                  </div>
                </div>

                <ul className="summary-list">
                  {result.responsibilities.map((item) => (
                    <li key={item}>
                      <span>→</span>
                      <p>{item}</p>
                    </li>
                  ))}

                  {result.responsibilities.length === 0 ? (
                    <li>
                      <span>→</span>
                      <p>No responsibilities were listed.</p>
                    </li>
                  ) : null}
                </ul>
              </div>
            </section>

            <section className="technologies-card">
              <div className="section-header">
                <div>
                  <p className="card-label">TECH STACK</p>

                  <h2>Technologies mentioned</h2>
                </div>

                <span className="technology-count">
                  {result.technologies.length} technologies
                </span>
              </div>

              <div className="technology-tags">
                {result.technologies.map((technology) => (
                  <span key={technology}>{technology}</span>
                ))}
              </div>
            </section>

            {result.preferredSkills.length > 0 ? (
              <section className="technologies-card">
                <div className="section-header">
                  <div>
                    <p className="card-label">NICE TO HAVE</p>

                    <h2>Preferred skills</h2>
                  </div>
                </div>

                <div className="technology-tags">
                  {result.preferredSkills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="quick-take-card">
          <div className="quick-take-icon">✦</div>

          <div className="quick-take-content">
            <p className="card-label">AI QUICK TAKE</p>

            <h2>Understand the role before you apply</h2>

            <p>
              Use the summary and tech stack to decide whether this role fits
              your goals, then check your resume match.
            </p>
          </div>

          <div className="quick-take-actions">
            <Link href="/features/resume/job-match" className="primary-button">
              Check Job Match
              <span>→</span>
            </Link>

            <Link
              href="/features/ai-tools/missing-skills"
              className="secondary-button"
            >
              Missing Skills
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
