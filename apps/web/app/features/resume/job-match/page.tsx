"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { ResumeJobMatchResult } from "@/lib/types";

import "./jobMatch.css";

export default function JobMatchPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<ResumeJobMatchResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  return (
    <main className="feature-page job-match-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">RESUME INTELLIGENCE</p>

            <h1>Resume ↔ Job Match</h1>

            <p className="feature-description">
              See how closely your resume matches a specific job and understand
              where you are strong or missing key requirements.
            </p>
          </div>

          <Link href="/features/resume/tailor" className="secondary-button">
            Tailor Resume
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Match your resume to a job"
          description="Paste the job description to see your overall match, matched skills, and gaps."
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
          submitLabel="Match Resume"
          onSubmit={() =>
            action.run("/api/resume/job-match", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Matching your resume to the role…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No match score yet"
            description="Add a job description and run the match to see how well your resume fits the role."
          />
        ) : null}

        {result ? (
          <>
            <section className="match-score-card">
              <div className="match-score-main">
                <div className="match-score-ring">
                  <div className="match-score-inner">
                    <strong>{result.overallMatch}</strong>
                    <span>% Match</span>
                  </div>
                </div>

                <div className="match-score-content">
                  <p className="card-label">OVERALL MATCH</p>

                  <h2>
                    {result.overallMatch >= 80
                      ? "Strong Job Match"
                      : result.overallMatch >= 60
                        ? "Moderate Job Match"
                        : "Weak Job Match"}
                  </h2>

                  <p>
                    Your resume matches {result.matchedSkills.length} of the{" "}
                    {result.matchedSkills.length + result.missingSkills.length}{" "}
                    identified requirements for this role.
                  </p>

                  <span className="match-status">
                    <span />
                    {result.overallMatch >= 60
                      ? "High compatibility"
                      : "Needs improvement"}
                  </span>
                </div>
              </div>

              <div className="match-score-stats">
                <div>
                  <span>Matched</span>
                  <strong>{result.overallMatch}%</strong>
                </div>

                <div>
                  <span>Missing</span>
                  <strong>{Math.max(0, 100 - result.overallMatch)}%</strong>
                </div>

                <div>
                  <span>Confidence</span>
                  <strong>
                    {result.overallMatch >= 75
                      ? "High"
                      : result.overallMatch >= 50
                        ? "Medium"
                        : "Low"}
                  </strong>
                </div>
              </div>
            </section>

            <section className="match-breakdown">
              <div className="section-header">
                <div>
                  <p className="card-label">MATCH BREAKDOWN</p>

                  <h2>How your resume compares</h2>
                </div>

                <span className="section-count">3 areas</span>
              </div>

              <div className="breakdown-list">
                {[
                  {
                    label: "Overall Match",
                    score: result.overallMatch,
                  },
                  {
                    label: "Experience Match",
                    score: result.experienceMatch,
                  },
                  {
                    label: "Education Match",
                    score: result.educationMatch,
                  },
                ].map((item) => (
                  <article className="breakdown-item" key={item.label}>
                    <div className="breakdown-top">
                      <div>
                        <h3>{item.label}</h3>
                      </div>

                      <strong>{item.score}%</strong>
                    </div>

                    <div className="match-progress">
                      <div
                        className="match-progress-fill"
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="skills-match-grid">
              <div className="skills-match-card">
                <div className="skills-heading">
                  <span className="skills-dot matched" />

                  <div>
                    <p className="card-label">MATCHED</p>
                    <h2>Skills You Have</h2>
                  </div>
                </div>

                <div className="skill-tags">
                  {result.matchedSkills.map((skill) => (
                    <span className="matched-tag" key={skill.skill}>
                      ✓ {skill.skill}
                    </span>
                  ))}

                  {result.matchedSkills.length === 0 ? (
                    <span className="matched-tag">No matches detected</span>
                  ) : null}
                </div>
              </div>

              <div className="skills-match-card">
                <div className="skills-heading">
                  <span className="skills-dot missing" />

                  <div>
                    <p className="card-label">MISSING</p>
                    <h2>Skills To Improve</h2>
                  </div>
                </div>

                <div className="skill-tags">
                  {result.missingSkills.map((skill) => (
                    <span className="missing-tag" key={skill.skill}>
                      + {skill.skill}
                    </span>
                  ))}

                  {result.missingSkills.length === 0 ? (
                    <span className="missing-tag">None detected</span>
                  ) : null}
                </div>
              </div>
            </section>

            {result.recommendations.length > 0 ? (
              <section className="match-recommendation">
                <div className="recommendation-icon">✦</div>

                <div className="recommendation-content">
                  <p className="card-label">AI RECOMMENDATION</p>

                  <h2>Next steps for this role</h2>

                  <ul>
                    {result.recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <Link href="/features/resume/tailor" className="primary-button">
                  Tailor for This Job
                  <span>→</span>
                </Link>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
