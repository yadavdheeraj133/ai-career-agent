"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { AtsResult } from "@/lib/types";

import "./ats.css";

export default function ATSScorePage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<AtsResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  return (
    <main className="feature-page ats-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">RESUME INTELLIGENCE</p>

            <h1>ATS Score</h1>

            <p className="feature-description">
              See how well your resume is optimized for Applicant Tracking
              Systems and discover what could improve your score.
            </p>
          </div>

          <Link href="/features/resume/analysis" className="secondary-button">
            View Resume Analysis
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Check your ATS compatibility"
          description="Paste the job description you are targeting. Your saved resume is prefilled below."
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
          submitLabel="Check ATS Score"
          onSubmit={() =>
            action.run("/api/resume/ats", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Scanning your resume for ATS compatibility…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No ATS score yet"
            description="Add a job description and run the check to see your keyword coverage, section parsing, and missing keywords."
          />
        ) : null}

        {result ? (
          <>
            <section className="ats-score-card">
              <div className="ats-score-main">
                <div className="ats-score-ring">
                  <div className="ats-score-ring-inner">
                    <strong>{result.overallScore}</strong>
                    <span>/ 100</span>
                  </div>
                </div>

                <div className="ats-score-content">
                  <p className="card-label">OVERALL ATS SCORE</p>

                  <h2>
                    {result.overallScore >= 80
                      ? "Good ATS Compatibility"
                      : result.overallScore >= 60
                        ? "Moderate ATS Compatibility"
                        : "Needs ATS Optimization"}
                  </h2>

                  <p>
                    {result.criticalMissingKeywords.length > 0
                      ? `Your resume is missing ${result.criticalMissingKeywords.length} critical keyword(s) that appear important for this role.`
                      : "No critical missing keywords were detected for this role."}
                  </p>

                  <div className="ats-status">
                    <span className="ats-status-dot" />
                    {result.overallScore >= 80
                      ? "Good compatibility"
                      : "Needs improvement"}
                  </div>
                </div>
              </div>

              <div className="ats-score-summary">
                <div>
                  <span>Keyword Match</span>
                  <strong>{result.keywordMatch}%</strong>
                </div>

                <div>
                  <span>Skills Match</span>
                  <strong>{result.requiredSkillsMatch}%</strong>
                </div>

                <div>
                  <span>Experience</span>
                  <strong>{result.experienceMatch}%</strong>
                </div>
              </div>
            </section>

            <section className="ats-breakdown">
              <div className="section-header">
                <div>
                  <p className="card-label">SCORE BREAKDOWN</p>

                  <h2>ATS Compatibility</h2>
                </div>

                <span className="section-count">5 categories</span>
              </div>

              <div className="ats-category-list">
                {[
                  { name: "Keyword Match", score: result.keywordMatch },
                  { name: "Required Skills", score: result.requiredSkillsMatch },
                  {
                    name: "Preferred Skills",
                    score: result.preferredSkillsMatch,
                  },
                  { name: "Experience", score: result.experienceMatch },
                  { name: "Education", score: result.educationMatch },
                ].map((category) => (
                  <article className="ats-category" key={category.name}>
                    <div className="ats-category-header">
                      <div>
                        <h3>{category.name}</h3>
                      </div>

                      <strong>{category.score}%</strong>
                    </div>

                    <div className="ats-progress">
                      <div
                        className="ats-progress-fill"
                        style={{ width: `${category.score}%` }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="ats-breakdown">
              <div className="section-header">
                <div>
                  <p className="card-label">KEYWORD ANALYSIS</p>

                  <h2>Matched vs missing keywords</h2>
                </div>
              </div>

              <p className="ai-field-label">Matched keywords</p>
              <div className="ai-tag-list">
                {result.matchedKeywords.map((keyword) => (
                  <span className="ai-tag" key={keyword}>
                    ✓ {keyword}
                  </span>
                ))}
                {result.matchedKeywords.length === 0 ? (
                  <span className="ai-tag muted">None detected</span>
                ) : null}
              </div>

              <p className="ai-field-label" style={{ marginTop: 16 }}>
                Missing keywords
              </p>
              <div className="ai-tag-list">
                {[...result.criticalMissingKeywords, ...result.missingKeywords]
                  .filter(
                    (keyword, index, list) => list.indexOf(keyword) === index
                  )
                  .map((keyword) => (
                    <span className="ai-tag muted" key={keyword}>
                      + {keyword}
                    </span>
                  ))}
                {result.criticalMissingKeywords.length === 0 &&
                result.missingKeywords.length === 0 ? (
                  <span className="ai-tag">No missing keywords 🎉</span>
                ) : null}
              </div>
            </section>

            {result.recommendations.length > 0 ? (
              <section className="ats-recommendations">
                <div className="recommendation-heading">
                  <div className="recommendation-icon">✦</div>

                  <div>
                    <p className="card-label">AI RECOMMENDATIONS</p>

                    <h2>Improve your ATS score</h2>
                  </div>
                </div>

                <div className="recommendation-list">
                  {result.recommendations.map((recommendation, index) => (
                    <div className="recommendation-item" key={recommendation}>
                      <span>{index + 1}</span>

                      <p>{recommendation}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="ats-action-card">
          <div>
            <p className="card-label">RECOMMENDED NEXT STEP</p>

            <h2>Make your resume ATS-ready</h2>

            <p>
              Tailor your resume to a specific job and improve the keywords
              that matter most.
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
              Resume Match
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
