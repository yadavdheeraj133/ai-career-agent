"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { SkillGapResult } from "@/lib/types";

import "./missingSkills.css";

export default function MissingSkillsPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<SkillGapResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  return (
    <main className="feature-page missing-skills-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI CAREER INTELLIGENCE</p>

            <h1>Missing Skills</h1>

            <p className="feature-description">
              Discover which skills you are missing for your target role and
              understand which ones are worth learning first.
            </p>
          </div>

          <Link href="/features/resume/job-match" className="secondary-button">
            View Job Match
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Find the skills you're missing"
          description="Compare your resume with a target job to see what to learn next."
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
          submitLabel="Find Missing Skills"
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
          <AiLoadingState label="Finding your missing skills…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No missing skills yet"
            description="Add a job description and run the analysis to see the skills worth learning first."
          />
        ) : null}

        {result ? (
          <>
            <section className="skills-summary">
              <div className="summary-main">
                <div className="summary-icon">✦</div>

                <div>
                  <p className="card-label">AI SKILL GAP ANALYSIS</p>

                  <h2>
                    {result.missingSkills.length} skills could improve your
                    profile
                  </h2>

                  <p>
                    {result.overallSkillMatch >= 75
                      ? "Your current skill set is strong, but adding the skills below would make you more competitive."
                      : "Adding the skills below would meaningfully improve your fit for this role."}
                  </p>
                </div>
              </div>

              <div className="summary-stats">
                <div>
                  <strong>{result.missingSkills.length}</strong>
                  <span>Missing Skills</span>
                </div>

                <div>
                  <strong>{result.criticalSkills.length}</strong>
                  <span>High Priority</span>
                </div>

                <div>
                  <strong>{result.overallSkillMatch}%</strong>
                  <span>Current Match</span>
                </div>
              </div>
            </section>

            <section className="target-role-card">
              <div>
                <p className="card-label">TARGET ROLE</p>

                <h2>Based on your job description</h2>

                <p>
                  Analysis generated from the resume and job description you
                  provided.
                </p>
              </div>

              <span className="role-badge">
                {result.missingSkills.length} skill gaps detected
              </span>
            </section>

            <section className="missing-skills-card">
              <div className="section-header">
                <div>
                  <p className="card-label">SKILL GAPS</p>

                  <h2>Skills you should consider learning</h2>
                </div>

                <span className="section-count">
                  {result.missingSkills.length} skills
                </span>
              </div>

              <div className="missing-skills-list">
                {result.missingSkills.map((skill) => (
                  <article className="missing-skill-row" key={skill.skill}>
                    <div className="skill-main">
                      <div className="skill-icon">
                        {skill.skill.slice(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <div className="skill-name-row">
                          <h3>{skill.skill}</h3>

                          <span
                            className={`importance-badge ${
                              skill.priority === "High" ? "high" : "medium"
                            }`}
                          >
                            {skill.priority} priority
                          </span>
                        </div>

                        <p>{skill.reason}</p>
                      </div>
                    </div>
                  </article>
                ))}

                {result.missingSkills.length === 0 ? (
                  <article className="missing-skill-row">
                    <div className="skill-main">
                      <div className="skill-icon">✓</div>

                      <div>
                        <div className="skill-name-row">
                          <h3>No missing skills detected</h3>
                        </div>

                        <p>
                          Your resume already covers the skills found in this
                          job description.
                        </p>
                      </div>
                    </div>
                  </article>
                ) : null}
              </div>
            </section>

            <section className="existing-skills-card">
              <div>
                <p className="card-label">YOUR CURRENT SKILLS</p>

                <h2>Skills already covered</h2>

                <p>
                  These skills are already contributing positively to your job
                  match.
                </p>
              </div>

              <div className="existing-skill-tags">
                {result.existingSkills.map((skill) => (
                  <span key={skill.skill}>✓ {skill.skill}</span>
                ))}

                {result.existingSkills.length === 0 ? (
                  <span>No existing skills detected</span>
                ) : null}
              </div>
            </section>

            {result.learningPriorities.length > 0 ? (
              <section className="priority-card">
                <div className="priority-heading">
                  <div className="priority-icon">↑</div>

                  <div>
                    <p className="card-label">LEARNING PRIORITY</p>

                    <h2>
                      Start with{" "}
                      {result.learningPriorities
                        .slice(0, 2)
                        .map((skill) => skill.skill)
                        .join(" and ")}
                    </h2>
                  </div>
                </div>

                <p>
                  These skills have the highest impact on your current job
                  match. Learning them first can give you the biggest
                  improvement.
                </p>

                <div className="priority-actions">
                  <Link
                    href="/features/career/learning-path"
                    className="primary-button"
                  >
                    Create Learning Path
                    <span>→</span>
                  </Link>

                  <Link
                    href="/features/career/roadmap"
                    className="secondary-button"
                  >
                    View Career Roadmap
                  </Link>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
