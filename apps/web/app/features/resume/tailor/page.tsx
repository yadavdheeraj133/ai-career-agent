"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { ResumeTailorResult } from "@/lib/types";

import "./tailor.css";

export default function ResumeTailorPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<ResumeTailorResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;
  const improvements = result
    ? [
        ...result.improvementSummary.atsImprovements,
        ...result.improvementSummary.notes,
      ]
    : [];

  return (
    <main className="feature-page tailor-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">RESUME INTELLIGENCE</p>

            <h1>Resume Tailoring</h1>

            <p className="feature-description">
              Customize your resume for a specific job while keeping your
              experience and personal voice intact.
            </p>
          </div>

          <Link href="/features/resume/analysis" className="secondary-button">
            Resume Analysis
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Tailor your resume"
          description="Paste the job you are applying for and AI will rewrite your resume to match it."
          fields={[
            {
              id: "resume",
              label: "Resume",
              value: resume.text,
              onChange: resume.setText,
              rows: 9,
              placeholder: "Paste your resume text here…",
              hint: resume.loading
                ? "Loading your saved resume…"
                : resume.hasResume
                  ? "Prefilled from your saved resume."
                  : "Paste your resume to get started.",
            },
            {
              id: "jobDescription",
              label: "Job Description",
              value: jobDescription,
              onChange: setJobDescription,
              rows: 9,
              placeholder: "Paste the job description here…",
            },
          ]}
          submitLabel="Tailor My Resume"
          onSubmit={() =>
            action.run("/api/resume/tailor", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Tailoring your resume…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No tailored resume yet"
            description="Paste a job description and generate a version of your resume optimized for that role."
          />
        ) : null}

        {result ? (
          <>
            <section className="target-job-card">
              <div className="target-job-info">
                <div className="job-icon">AI</div>

                <div>
                  <p className="card-label">TAILORED RESUME</p>

                  <h2>{result.title}</h2>

                  <p>Optimized for the job description you provided.</p>
                </div>
              </div>
            </section>

            {improvements.length > 0 ? (
              <section className="suggestions-card">
                <div className="section-header">
                  <div>
                    <p className="card-label">AI RECOMMENDATIONS</p>

                    <h2>What AI improved</h2>
                  </div>

                  <span className="suggestion-count">
                    {improvements.length} areas
                  </span>
                </div>

                <div className="suggestions-list">
                  {improvements.map((suggestion, index) => (
                    <article className="suggestion-item" key={suggestion}>
                      <span className="suggestion-number">{index + 1}</span>

                      <div>
                        <p>{suggestion}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="preview-card">
              <div className="section-header">
                <div>
                  <p className="card-label">PREVIEW</p>

                  <h2>Your tailored resume</h2>
                </div>

                <span className="preview-label">AI GENERATED</span>
              </div>

              <div className="preview-grid">
                <div className="preview-column">
                  <span className="preview-column-label">SUMMARY</span>

                  <div className="resume-preview improved">
                    <h3>{result.title}</h3>

                    <p>{result.summary}</p>
                  </div>
                </div>

                <div className="preview-arrow">→</div>

                <div className="preview-column">
                  <span className="preview-column-label">SKILLS</span>

                  <div className="resume-preview improved">
                    <div className="ai-tag-list">
                      {result.skills.map((skill) => (
                        <span className="ai-tag" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {result.experience.length > 0 ? (
                <div className="suggestions-list">
                  {result.experience.map((item) => (
                    <article
                      className="suggestion-item"
                      key={`${item.company}-${item.position}`}
                    >
                      <span className="suggestion-number">•</span>

                      <div>
                        <h3>
                          {item.position} — {item.company}
                        </h3>

                        <p>
                          {[item.startDate, item.endDate]
                            .filter(Boolean)
                            .join(" – ")}
                        </p>

                        <ul>
                          {item.responsibilities.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {result.improvementSummary.remainingMissingKeywords.length >
              0 ? (
                <>
                  <p className="card-label" style={{ marginTop: 16 }}>
                    STILL MISSING KEYWORDS
                  </p>

                  <div className="ai-tag-list">
                    {result.improvementSummary.remainingMissingKeywords.map(
                      (keyword) => (
                        <span className="ai-tag muted" key={keyword}>
                          + {keyword}
                        </span>
                      )
                    )}
                  </div>
                </>
              ) : null}
            </section>
          </>
        ) : null}

        <section className="tailor-action-card">
          <div>
            <p className="card-label">READY TO TAILOR?</p>

            <h2>Create your optimized resume</h2>

            <p>
              AI will analyze the target job and suggest improvements based on
              your existing experience.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              if (canRun) {
                void action.run("/api/resume/tailor", {
                  resume: resume.text,
                  jobDescription,
                });
              }
            }}
            disabled={!canRun}
          >
            Tailor My Resume
            <span>→</span>
          </button>
        </section>
      </div>
    </main>
  );
}
