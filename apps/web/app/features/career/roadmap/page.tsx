"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { CareerRoadmapResult } from "@/lib/types";

import "./roadmap.css";

function stepStatus(index: number): string {
  if (index === 0) {
    return "Current";
  }

  if (index === 1) {
    return "Next";
  }

  return "Upcoming";
}

export default function CareerRoadmapPage() {
  const resume = useResumeText();
  const [currentRole, setCurrentRole] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [selectedStep, setSelectedStep] = useState(0);
  const action = useAiAction<CareerRoadmapResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    careerGoal.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  return (
    <main className="feature-page career-roadmap-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI CAREER INTELLIGENCE</p>

            <h1>Career Roadmap</h1>

            <p className="feature-description">
              Follow a personalized step-by-step roadmap designed to help you
              move from your current skills toward your target career.
            </p>
          </div>

          <Link href="/features/career/coach" className="secondary-button">
            Career Coach
          </Link>
        </header>

        <AiToolPanel
          eyebrow="YOUR PROFILE + GOAL"
          title="Build your career roadmap"
          description="Tell AI where you are now and the role you're aiming for."
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
          submitLabel="Build Roadmap"
          onSubmit={() =>
            action.run("/api/career/roadmap", {
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
          <AiLoadingState label="Building your roadmap…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No roadmap yet"
            description="Add your resume and career goal to generate a step-by-step roadmap."
          />
        ) : null}

        {result ? (
          <>
            <section className="roadmap-goal">
              <div className="goal-icon">🎯</div>

              <div className="goal-content">
                <p className="card-label">YOUR CAREER GOAL</p>

                <h2>{result.targetRole}</h2>

                <p>
                  Starting from the {result.currentLevel} level · Estimated
                  timeline: {result.estimatedTimeline}
                </p>
              </div>
            </section>

            <section className="roadmap-section">
              <div className="section-header">
                <div>
                  <p className="card-label">PERSONALIZED ROADMAP</p>

                  <h2>Your career journey</h2>
                </div>

                <span className="section-count">
                  {result.roadmap.length} phases
                </span>
              </div>

              <div className="roadmap-list">
                {result.roadmap.map((step, index) => (
                  <article
                    className={`roadmap-step ${
                      selectedStep === index ? "active" : ""
                    }`}
                    key={step.title}
                    onClick={() => setSelectedStep(index)}
                  >
                    <div className="step-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="step-line">
                      {index !== result.roadmap.length - 1 ? <span /> : null}
                    </div>

                    <div className="step-content">
                      <div className="step-top">
                        <div>
                          <div className="step-title">
                            <h3>{step.title}</h3>

                            <span
                              className={`step-status ${stepStatus(
                                index
                              ).toLowerCase()}`}
                            >
                              {stepStatus(index)}
                            </span>
                          </div>
                        </div>

                        <span className="step-arrow">
                          {selectedStep === index ? "↑" : "↓"}
                        </span>
                      </div>

                      {selectedStep === index ? (
                        <div className="step-details">
                          <p>{step.objective}</p>

                          {step.skills.length > 0 ? (
                            <div className="skill-tags">
                              {step.skills.map((skill) => (
                                <span key={skill}>{skill}</span>
                              ))}
                            </div>
                          ) : null}

                          {step.projects.length > 0 ? (
                            <>
                              <p className="card-label">PROJECTS</p>

                              <ul>
                                {step.projects.map((project) => (
                                  <li key={project}>{project}</li>
                                ))}
                              </ul>
                            </>
                          ) : null}

                          {step.certifications.length > 0 ? (
                            <>
                              <p className="card-label">CERTIFICATIONS</p>

                              <ul>
                                {step.certifications.map((certification) => (
                                  <li key={certification}>{certification}</li>
                                ))}
                              </ul>
                            </>
                          ) : null}

                          <p className="card-label">EXPECTED OUTCOME</p>

                          <p>{step.expectedOutcome}</p>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {result.successTips.length > 0 || result.finalAdvice ? (
              <section className="roadmap-recommendation">
                <div className="recommendation-icon">✦</div>

                <div>
                  <p className="card-label">AI RECOMMENDATION</p>

                  <h2>How to succeed on this roadmap</h2>

                  {result.finalAdvice ? <p>{result.finalAdvice}</p> : null}

                  {result.successTips.length > 0 ? (
                    <ul>
                      {result.successTips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <Link
                  href="/features/career/learning-path"
                  className="primary-button"
                >
                  Learning Path
                  <span>→</span>
                </Link>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="roadmap-action">
          <div>
            <p className="card-label">KEEP MOVING</p>

            <h2>Turn your roadmap into daily learning</h2>

            <p>
              Follow a structured learning path and track the skills you need
              to reach your career goal.
            </p>
          </div>

          <div className="action-buttons">
            <Link href="/features/career/coach" className="secondary-button">
              Ask Career Coach
            </Link>

            <Link
              href="/features/career/learning-path"
              className="primary-button"
            >
              Start Learning
              <span>→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
