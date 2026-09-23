"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { AIVerdictResult } from "@/lib/types";

import "./verdict.css";

export default function AIVerdictPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<AIVerdictResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  return (
    <main className="feature-page verdict-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI CAREER INTELLIGENCE</p>

            <h1>AI Verdict</h1>

            <p className="feature-description">
              Get an AI-powered assessment of how strong your profile is for
              your target job.
            </p>
          </div>

          <Link href="/features/resume/job-match" className="secondary-button">
            View Job Match
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Get your AI verdict"
          description="Paste the job description and AI will give you a clear verdict on your fit."
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
          submitLabel="Get AI Verdict"
          onSubmit={() =>
            action.run("/api/resume/ai-verdict", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Evaluating your profile…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No verdict yet"
            description="Add a job description and run the assessment to see your verdict, strengths, and concerns."
          />
        ) : null}

        {result ? (
          <>
            <section className="verdict-hero">
              <div className="verdict-score-area">
                <div className="verdict-ring">
                  <div className="verdict-ring-inner">
                    <strong>{result.score}</strong>
                    <span>/ 100</span>
                  </div>
                </div>

                <div className="verdict-result">
                  <p className="card-label">AI VERDICT</p>

                  <h2>{result.verdict}</h2>
                </div>
              </div>

              <div className="verdict-message">
                <p>{result.summary}</p>

                <div className="verdict-confidence">
                  <span>Recommendation</span>

                  <strong>{result.recommendation}</strong>
                </div>
              </div>
            </section>

            {result.reasons.length > 0 ? (
              <section className="verdict-breakdown">
                <div className="section-header">
                  <div>
                    <p className="card-label">AI ASSESSMENT</p>

                    <h2>Why this verdict?</h2>
                  </div>

                  <span className="section-count">
                    {result.reasons.length} reasons
                  </span>
                </div>

                <div className="verdict-points">
                  {result.reasons.map((reason) => (
                    <article className="verdict-point" key={reason}>
                      <div className="verdict-point-top">
                        <div>
                          <h3>{reason}</h3>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="verdict-insight-grid">
              <div className="verdict-insight-card">
                <div className="insight-heading">
                  <span className="insight-dot positive" />

                  <div>
                    <p className="card-label">POSITIVE SIGNALS</p>

                    <h2>Why you stand out</h2>
                  </div>
                </div>

                <ul>
                  {result.strengths.map((item) => (
                    <li key={item}>
                      <span>✓</span>
                      {item}
                    </li>
                  ))}

                  {result.strengths.length === 0 ? (
                    <li>
                      <span>✓</span>
                      No strengths were returned.
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="verdict-insight-card">
                <div className="insight-heading">
                  <span className="insight-dot concern" />

                  <div>
                    <p className="card-label">AREAS OF CONCERN</p>

                    <h2>What could hurt your chances</h2>
                  </div>
                </div>

                <ul>
                  {result.concerns.map((item) => (
                    <li key={item}>
                      <span>!</span>
                      {item}
                    </li>
                  ))}

                  {result.concerns.length === 0 ? (
                    <li>
                      <span>!</span>
                      No concerns were returned.
                    </li>
                  ) : null}
                </ul>
              </div>
            </section>
          </>
        ) : null}

        <section className="verdict-action">
          <div className="verdict-action-icon">✦</div>

          <div className="verdict-action-content">
            <p className="card-label">AI RECOMMENDATION</p>

            <h2>Act on your verdict</h2>

            <p>
              Tailor your resume and address the missing skills to improve your
              chances.
            </p>
          </div>

          <div className="verdict-action-buttons">
            <Link href="/features/resume/tailor" className="primary-button">
              Tailor Resume
              <span>→</span>
            </Link>

            <Link href="/features/resume/skill-gap" className="secondary-button">
              View Skill Gaps
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
