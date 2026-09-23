"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { InterviewProbabilityResult } from "@/lib/types";

import "./interviewProbability.css";

function probabilityBand(probability: number): string {
  if (probability >= 85) {
    return "Excellent";
  }

  if (probability >= 70) {
    return "Good";
  }

  if (probability >= 50) {
    return "Average";
  }

  return "Low";
}

export default function InterviewProbabilityPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<InterviewProbabilityResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  return (
    <main className="feature-page interview-probability-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI CAREER INTELLIGENCE</p>

            <h1>Interview Probability</h1>

            <p className="feature-description">
              Estimate how likely your profile is to move from application to
              interview based on your resume and the target job.
            </p>
          </div>

          <Link href="/features/ai-tools/verdict" className="secondary-button">
            View AI Verdict
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Estimate your interview probability"
          description="Paste the job description and AI will assess how likely you are to reach the interview stage."
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
          submitLabel="Calculate Probability"
          onSubmit={() =>
            action.run("/api/resume/interview-probability", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Calculating your interview probability…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No probability yet"
            description="Add a job description and run the estimate to see your probability and the factors behind it."
          />
        ) : null}

        {result ? (
          <>
            <section className="probability-hero">
              <div className="probability-score-area">
                <div className="probability-ring">
                  <div className="probability-ring-inner">
                    <strong>{result.probability}</strong>
                    <span>%</span>
                  </div>
                </div>

                <div className="probability-result">
                  <p className="card-label">INTERVIEW PROBABILITY</p>

                  <h2>{probabilityBand(result.probability)} Probability</h2>

                  <div className="probability-status">
                    <span />
                    {probabilityBand(result.probability)} range
                  </div>
                </div>
              </div>

              <div className="probability-message">
                <p>{result.assessment}</p>

                <div className="probability-meta">
                  <div>
                    <span>Profile strength</span>
                    <strong>{probabilityBand(result.probability)}</strong>
                  </div>

                  <div>
                    <span>Confidence</span>
                    <strong>{result.confidence}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="probability-breakdown">
              <div className="section-header">
                <div>
                  <p className="card-label">AI ANALYSIS</p>

                  <h2>What influences your probability?</h2>
                </div>

                <span className="section-count">
                  {result.positiveFactors.length + result.riskFactors.length}{" "}
                  factors
                </span>
              </div>

              <div className="factor-list">
                {result.positiveFactors.map((factor) => (
                  <article className="factor-item" key={factor}>
                    <div className="factor-top">
                      <div>
                        <h3>Positive factor</h3>
                        <p>{factor}</p>
                      </div>
                    </div>
                  </article>
                ))}

                {result.riskFactors.map((factor) => (
                  <article className="factor-item" key={factor}>
                    <div className="factor-top">
                      <div>
                        <h3>Risk factor</h3>
                        <p>{factor}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="probability-scale-card">
              <div className="section-header">
                <div>
                  <p className="card-label">PROBABILITY SCALE</p>

                  <h2>Where you currently stand</h2>
                </div>
              </div>

              <div className="scale">
                <div className="scale-track">
                  <div
                    className="scale-fill"
                    style={{ width: `${result.probability}%` }}
                  />

                  <div
                    className="scale-marker"
                    style={{ left: `${result.probability}%` }}
                  >
                    <span>{result.probability}%</span>
                  </div>
                </div>

                <div className="scale-labels">
                  <span>Low</span>
                  <span>Average</span>
                  <span>Good</span>
                  <span>Excellent</span>
                </div>
              </div>

              <p className="scale-message">
                You are currently in the{" "}
                <strong>{probabilityBand(result.probability)}</strong> range.
                Small, targeted improvements can move your profile higher.
              </p>
            </section>

            {result.recommendations.length > 0 ? (
              <section className="probability-recommendations">
                <div className="recommendation-heading">
                  <div className="recommendation-icon">✦</div>

                  <div>
                    <p className="card-label">AI RECOMMENDATIONS</p>

                    <h2>Increase your interview chances</h2>
                  </div>
                </div>

                <div className="recommendation-list">
                  {result.recommendations.map((recommendation, index) => (
                    <div
                      className="recommendation-item"
                      key={recommendation}
                    >
                      <span>{index + 1}</span>

                      <p>{recommendation}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="probability-action">
          <div>
            <p className="card-label">RECOMMENDED NEXT STEP</p>

            <h2>Improve your interview probability</h2>

            <p>
              Tailor your resume for this job and make your strongest
              experience easier for recruiters to discover.
            </p>
          </div>

          <div className="action-buttons">
            <Link href="/features/resume/tailor" className="primary-button">
              Tailor Resume
              <span>→</span>
            </Link>

            <Link
              href="/features/resume/job-match"
              className="secondary-button"
            >
              Check Job Match
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
