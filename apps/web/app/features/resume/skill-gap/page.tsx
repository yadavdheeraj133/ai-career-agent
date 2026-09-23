"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { SkillGapResult } from "@/lib/types";

import "./skillGap.css";

export default function SkillGapPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<SkillGapResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  return (
    <main className="feature-page skill-gap-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">RESUME INTELLIGENCE</p>

            <h1>Skill Gap Analysis</h1>

            <p className="feature-description">
              Discover the skills you already have and identify the ones that
              could improve your career opportunities.
            </p>
          </div>

          <Link
            href="/features/career/learning-path"
            className="secondary-button"
          >
            View Learning Path
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Find your skill gaps"
          description="Compare your resume against a target job to see which skills matter most."
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
          submitLabel="Analyze Skill Gap"
          onSubmit={() =>
            action.run("/api/resume/skill-gap", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Comparing your skills against the role…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No skill gap analysis yet"
            description="Add a job description and run the analysis to see matched skills, missing skills, and what to learn next."
          />
        ) : null}

        {result ? (
          <>
            <section className="skill-gap-overview">
              <div className="skill-gap-score">
                <p className="card-label">SKILL COVERAGE</p>

                <div className="coverage-number">
                  <strong>{result.overallSkillMatch}%</strong>
                  <span>Match</span>
                </div>

                <div className="coverage-progress">
                  <div
                    className="coverage-progress-fill"
                    style={{ width: `${result.overallSkillMatch}%` }}
                  />
                </div>

                <p>
                  {result.overallSkillMatch >= 75
                    ? "You have strong coverage of the skills required for this role."
                    : "Several skills can be developed to improve your fit for this role."}
                </p>
              </div>

              <div className="skill-gap-stats">
                <div className="skill-stat">
                  <span>Matched Skills</span>
                  <strong>{result.existingSkills.length}</strong>
                </div>

                <div className="skill-stat">
                  <span>Missing Skills</span>
                  <strong>{result.missingSkills.length}</strong>
                </div>

                <div className="skill-stat">
                  <span>High Priority</span>
                  <strong>{result.criticalSkills.length}</strong>
                </div>
              </div>
            </section>

            <section className="matched-section">
              <div className="section-header">
                <div>
                  <p className="card-label">YOUR STRENGTHS</p>
                  <h2>Skills You Already Have</h2>
                </div>

                <span className="section-count">
                  {result.existingSkills.length} skills
                </span>
              </div>

              <div className="matched-skills">
                {result.existingSkills.map((skill) => (
                  <span className="matched-skill" key={skill.skill}>
                    <span>✓</span>
                    {skill.skill}
                  </span>
                ))}

                {result.existingSkills.length === 0 ? (
                  <span className="matched-skill">No matches detected</span>
                ) : null}
              </div>
            </section>

            <section className="missing-section">
              <div className="section-header">
                <div>
                  <p className="card-label">AI ANALYSIS</p>
                  <h2>Skills To Develop</h2>
                </div>

                <span className="section-count">
                  {result.missingSkills.length} identified
                </span>
              </div>

              <div className="missing-skills-list">
                {result.missingSkills.map((skill) => (
                  <article className="missing-skill" key={skill.skill}>
                    <div className="missing-skill-main">
                      <div className="skill-icon">+</div>

                      <div>
                        <h3>{skill.skill}</h3>
                        <p>{skill.reason}</p>
                      </div>
                    </div>

                    <span
                      className={`importance ${skill.priority.toLowerCase()}`}
                    >
                      {skill.priority}
                    </span>
                  </article>
                ))}

                {result.missingSkills.length === 0 ? (
                  <article className="missing-skill">
                    <div className="missing-skill-main">
                      <div className="skill-icon">✓</div>

                      <div>
                        <h3>No missing skills detected</h3>
                        <p>Your resume covers the skills found in this job.</p>
                      </div>
                    </div>
                  </article>
                ) : null}
              </div>
            </section>

            {result.learningPriorities.length > 0 ? (
              <section className="missing-section">
                <div className="section-header">
                  <div>
                    <p className="card-label">LEARNING PRIORITIES</p>
                    <h2>What to learn first</h2>
                  </div>

                  <span className="section-count">
                    {result.learningPriorities.length} priorities
                  </span>
                </div>

                <div className="missing-skills-list">
                  {result.learningPriorities.map((skill) => (
                    <article className="missing-skill" key={skill.skill}>
                      <div className="missing-skill-main">
                        <div className="skill-icon">★</div>

                        <div>
                          <h3>{skill.skill}</h3>
                          <p>{skill.reason}</p>
                        </div>
                      </div>

                      <span
                        className={`importance ${skill.priority.toLowerCase()}`}
                      >
                        {skill.priority}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="skill-gap-action">
          <div>
            <p className="card-label">RECOMMENDED NEXT STEP</p>

            <h2>Turn your skill gaps into a plan</h2>

            <p>
              Build a personalized learning path based on the skills that
              matter most for your career goals.
            </p>
          </div>

          <Link href="/features/career/learning-path" className="primary-button">
            Build Learning Path
            <span>→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
