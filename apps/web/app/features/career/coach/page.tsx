"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { CareerCoachResult } from "@/lib/types";

import "./coach.css";

export default function CareerCoachPage() {
  const resume = useResumeText();
  const [currentRole, setCurrentRole] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const action = useAiAction<CareerCoachResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    careerGoal.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  return (
    <main className="feature-page career-coach-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI CAREER INTELLIGENCE</p>

            <h1>Career Coach</h1>

            <p className="feature-description">
              Get personalized career guidance based on your skills,
              experience, goals, and target role.
            </p>
          </div>

          <Link href="/features/career/roadmap" className="secondary-button">
            Career Roadmap
          </Link>
        </header>

        <AiToolPanel
          eyebrow="YOUR PROFILE + GOAL"
          title="Ask your AI career coach"
          description="Tell the coach where you are today and where you want to go."
          fields={[
            {
              id: "resume",
              label: "Resume",
              value: resume.text,
              onChange: resume.setText,
              rows: 8,
              placeholder: "Paste your resume text here…",
              hint: resume.loading
                ? "Loading your saved resume…"
                : resume.hasResume
                  ? "Prefilled from your saved resume."
                  : "Paste your resume to get started.",
            },
            {
              id: "currentRole",
              label: "Current Role",
              value: currentRole,
              onChange: setCurrentRole,
              placeholder: "e.g. Frontend Developer",
              singleLine: true,
            },
            {
              id: "careerGoal",
              label: "Career Goal",
              value: careerGoal,
              onChange: setCareerGoal,
              placeholder: "e.g. Become a Full Stack Developer",
              singleLine: true,
            },
          ]}
          submitLabel="Get Career Guidance"
          onSubmit={() =>
            action.run("/api/career/coach", {
              resume: resume.text,
              currentRole,
              careerGoal,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Coaching your career path…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No coaching yet"
            description="Add your resume and career goal to get personalized guidance, strengths, and next steps."
          />
        ) : null}

        {result ? (
          <>
            <section className="coach-hero">
              <div className="coach-avatar">✦</div>

              <div className="coach-hero-content">
                <p className="card-label">YOUR AI CAREER COACH</p>

                <h2>You are at the {result.currentLevel} level</h2>

                <p>{result.careerReadiness}</p>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-header">
                <div>
                  <p className="card-label">CURRENT DIRECTION</p>

                  <h2>Your career profile</h2>
                </div>

                <span className="profile-badge">{result.currentLevel}</span>
              </div>

              <div className="profile-grid">
                <div className="profile-item">
                  <span>Current Level</span>
                  <strong>{result.currentLevel}</strong>
                </div>

                <div className="profile-item">
                  <span>Career Goal</span>
                  <strong>{result.careerGoal}</strong>
                </div>

                <div className="profile-item">
                  <span>Strengths</span>
                  <strong>{result.strengths.length}</strong>
                </div>

                <div className="profile-item">
                  <span>Transferable Skills</span>
                  <strong>{result.transferableSkills.length}</strong>
                </div>
              </div>
            </section>

            <section className="focus-section">
              <div className="section-header">
                <div>
                  <p className="card-label">CAREER ASSESSMENT</p>

                  <h2>Your strengths and focus areas</h2>
                </div>

                <span className="section-count">
                  {result.strengths.length + result.weaknesses.length} areas
                </span>
              </div>

              <div className="focus-list">
                {result.strengths.map((item) => (
                  <article className="focus-row" key={item}>
                    <div className="focus-info">
                      <div className="focus-title">
                        <h3>{item}</h3>

                        <span className="status strong">Strength</span>
                      </div>
                    </div>
                  </article>
                ))}

                {result.weaknesses.map((item) => (
                  <article className="focus-row" key={item}>
                    <div className="focus-info">
                      <div className="focus-title">
                        <h3>{item}</h3>

                        <span className="status developing">Focus</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {result.transferableSkills.length > 0 ? (
              <section className="focus-section">
                <div className="section-header">
                  <div>
                    <p className="card-label">TRANSFERABLE SKILLS</p>

                    <h2>Skills you can carry forward</h2>
                  </div>
                </div>

                <div className="ai-tag-list">
                  {result.transferableSkills.map((skill) => (
                    <span className="ai-tag" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="recommendation-card">
              <div className="recommendation-icon">✦</div>

              <div className="recommendation-content">
                <p className="card-label">AI RECOMMENDATIONS</p>

                <h2>What you should focus on next</h2>

                <ul>
                  {result.recommendedNextSteps.map((recommendation) => (
                    <li key={recommendation}>
                      <span>✓</span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {result.commonMistakesToAvoid.length > 0 ? (
              <section className="recommendation-card">
                <div className="recommendation-icon">!</div>

                <div className="recommendation-content">
                  <p className="card-label">COMMON MISTAKES TO AVOID</p>

                  <h2>Watch out for these</h2>

                  <ul>
                    {result.commonMistakesToAvoid.map((mistake) => (
                      <li key={mistake}>
                        <span>✗</span>
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            {result.motivation ? (
              <section className="coach-response">
                <div className="response-icon">✦</div>

                <div>
                  <p className="card-label">A NOTE FROM YOUR COACH</p>

                  <p>{result.motivation}</p>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="coach-action">
          <div>
            <p className="card-label">NEXT STEP</p>

            <h2>Turn your goals into a plan</h2>

            <p>
              Build a personalized roadmap and learning path for your target
              career.
            </p>
          </div>

          <div className="action-buttons">
            <Link
              href="/features/career/roadmap"
              className="secondary-button"
            >
              Career Roadmap
            </Link>

            <Link
              href="/features/career/learning-path"
              className="primary-button"
            >
              Learning Path
              <span>→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
