"use client";

import Link from "next/link";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { ResumeAnalysis } from "@/lib/types";

import "./analysis.css";

const SECTION_LABELS: {
  key: keyof ResumeAnalysis["sectionScores"];
  name: string;
}[] = [
  { key: "title", name: "Title" },
  { key: "summary", name: "Professional Summary" },
  { key: "experience", name: "Experience" },
  { key: "projects", name: "Projects" },
  { key: "skills", name: "Skills" },
  { key: "education", name: "Education" },
  { key: "certifications", name: "Certifications" },
  { key: "achievements", name: "Achievements" },
  { key: "languages", name: "Languages" },
  { key: "links", name: "Links" },
  { key: "formatting", name: "Formatting" },
];

function scoreStatus(score: number): string {
  if (score >= 90) {
    return "Strong";
  }

  if (score >= 80) {
    return "Good";
  }

  return "Needs Work";
}

export default function ResumeAnalysisPage() {
  const resume = useResumeText();
  const action = useAiAction<ResumeAnalysis>();

  const canRun = resume.text.trim().length > 0 && !action.loading;
  const result = action.data;

  return (
    <main className="feature-page resume-analysis-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">RESUME INTELLIGENCE</p>

            <h1>Resume Analysis</h1>

            <p className="feature-description">
              Get a clear breakdown of your resume and discover what you can
              improve.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={action.reset}
            disabled={!result}
          >
            New Analysis
          </button>
        </header>

        <AiToolPanel
          eyebrow="RESUME INPUT"
          title="Analyze your resume"
          description="Your saved resume is prefilled below. Edit it if you want to analyze a different version."
          fields={[
            {
              id: "resume",
              label: "Resume",
              value: resume.text,
              onChange: resume.setText,
              rows: 10,
              placeholder: "Paste your resume text here…",
              hint: resume.loading
                ? "Loading your saved resume…"
                : resume.hasResume
                  ? "Prefilled from your saved resume."
                  : resume.error
                    ? resume.error
                    : "You don't have a saved resume yet — paste one to analyze.",
            },
          ]}
          submitLabel="Analyze Resume"
          onSubmit={() =>
            action.run("/api/resume/analyze", { resume: resume.text })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? <AiLoadingState label="Analyzing your resume…" /> : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No analysis yet"
            description="Run the analysis to see your overall score, section-by-section feedback, and tailored recommendations."
          />
        ) : null}

        {result ? (
          <>
            <section className="analysis-overview">
              <div className="score-card">
                <div className="score-card-top">
                  <div>
                    <p className="card-label">OVERALL RESUME SCORE</p>

                    <h2>{result.overallScore}</h2>

                    <p className="score-out-of">out of 100</p>
                  </div>

                  <div className="score-circle">
                    <span>{result.overallScore}%</span>
                  </div>
                </div>

                <div className="score-progress">
                  <div
                    className="score-progress-fill"
                    style={{ width: `${result.overallScore}%` }}
                  />
                </div>

                <p className="score-message">
                  {result.overallScore >= 80
                    ? "Your resume is in good shape. A few improvements can make it significantly stronger."
                    : "There is meaningful room to strengthen your resume. Start with the recommendations below."}
                </p>
              </div>

              <div className="summary-card">
                <div className="card-heading">
                  <div>
                    <p className="card-label">AI SUMMARY</p>

                    <h2>
                      {result.overallScore >= 80 ? "Good foundation" : "Room to grow"}
                    </h2>
                  </div>

                  <span className="summary-icon">✦</span>
                </div>

                <p>{result.summary}</p>

                <div className="summary-meta">
                  <span>{SECTION_LABELS.length} sections analyzed</span>
                  <span>•</span>
                  <span>{result.weaknesses.length} improvement areas</span>
                </div>
              </div>
            </section>

            <section className="insight-grid">
              <div className="insight-card">
                <div className="insight-title">
                  <span className="insight-dot success" />

                  <h2>What&apos;s working</h2>
                </div>

                <ul>
                  {result.strengths.map((item) => (
                    <li key={item.title}>
                      <span>✓</span>
                      {item.title} — {item.description}
                    </li>
                  ))}

                  {result.strengths.length === 0 ? (
                    <li>No strengths were returned.</li>
                  ) : null}
                </ul>
              </div>

              <div className="insight-card">
                <div className="insight-title">
                  <span className="insight-dot warning" />

                  <h2>What to improve</h2>
                </div>

                <ul>
                  {result.weaknesses.map((item) => (
                    <li key={item.title}>
                      <span>→</span>
                      {item.title} — {item.improvement}
                    </li>
                  ))}

                  {result.weaknesses.length === 0 ? (
                    <li>No improvement areas were returned.</li>
                  ) : null}
                </ul>
              </div>
            </section>

            <section className="section-analysis">
              <div className="section-header">
                <div>
                  <p className="card-label">DETAILED REVIEW</p>

                  <h2>Section Analysis</h2>
                </div>

                <span className="section-count">
                  {SECTION_LABELS.length} sections
                </span>
              </div>

              <div className="analysis-list">
                {SECTION_LABELS.map((section) => {
                  const score = result.sectionScores[section.key];

                  return (
                    <article className="analysis-row" key={section.key}>
                      <div className="analysis-row-info">
                        <div className="analysis-status">
                          <span
                            className={`status-dot ${
                              score >= 90
                                ? "strong"
                                : score >= 80
                                  ? "good"
                                  : "needs-work"
                            }`}
                          />
                        </div>

                        <div>
                          <h3>{section.name}</h3>
                        </div>
                      </div>

                      <div className="analysis-score">
                        <span>{scoreStatus(score)}</span>

                        <strong>{score}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {result.recommendations.length > 0 ? (
              <section className="insight-card">
                <div className="insight-title">
                  <span className="insight-dot success" />

                  <h2>Recommendations</h2>
                </div>

                <ul>
                  {result.recommendations.map((item) => (
                    <li key={item}>
                      <span>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="action-card">
          <div>
            <p className="card-label">NEXT STEP</p>

            <h2>Make your resume stronger</h2>

            <p>
              Use AI to tailor your resume, improve your ATS score, and close
              the biggest skill gaps.
            </p>
          </div>

          <div className="action-buttons">
            <Link href="/features/resume/tailor" className="primary-button">
              Tailor Resume
              <span>→</span>
            </Link>

            <Link href="/features/resume/ats" className="secondary-button">
              Check ATS Score
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
