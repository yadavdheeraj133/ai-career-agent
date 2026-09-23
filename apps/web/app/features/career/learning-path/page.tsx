"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { LearningPathResult } from "@/lib/types";

import "./learning-path.css";

export default function LearningPathPage() {
  const resume = useResumeText();
  const [careerGoal, setCareerGoal] = useState("");
  const [selectedModule, setSelectedModule] = useState(0);
  const action = useAiAction<LearningPathResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    careerGoal.trim().length > 0 &&
    !action.loading;

  const result = action.data;
  const currentStage = result?.learningPath[0] ?? null;

  return (
    <main className="feature-page learning-path-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI CAREER INTELLIGENCE</p>

            <h1>Learning Path</h1>

            <p className="feature-description">
              Follow a personalized learning path based on your career goal,
              current skills, and the gaps you need to close.
            </p>
          </div>

          <Link href="/features/career/roadmap" className="secondary-button">
            Career Roadmap
          </Link>
        </header>

        <AiToolPanel
          eyebrow="YOUR PROFILE + GOAL"
          title="Build your learning path"
          description="AI will turn your career goal into a structured curriculum."
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
              id: "careerGoal",
              label: "Career Goal",
              value: careerGoal,
              onChange: setCareerGoal,
              placeholder: "e.g. Become a Full Stack Developer",
              singleLine: true,
            },
          ]}
          submitLabel="Build Learning Path"
          onSubmit={() =>
            action.run("/api/career/learning-path", {
              resume: resume.text,
              careerGoal,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Building your learning path…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No learning path yet"
            description="Add your resume and career goal to generate a structured learning curriculum."
          />
        ) : null}

        {result ? (
          <>
            <section className="learning-goal">
              <div className="goal-icon">✦</div>

              <div className="goal-content">
                <p className="card-label">LEARNING GOAL</p>

                <h2>{result.careerGoal}</h2>

                <p>Estimated duration: {result.estimatedDuration}</p>
              </div>
            </section>

            {currentStage ? (
              <section className="current-focus">
                <div className="focus-icon">▶</div>

                <div className="focus-content">
                  <p className="card-label">START HERE</p>

                  <h2>{currentStage.title}</h2>

                  <p>{currentStage.description}</p>
                </div>
              </section>
            ) : null}

            <section className="modules-section">
              <div className="section-header">
                <div>
                  <p className="card-label">PERSONALIZED CURRICULUM</p>

                  <h2>Your learning path</h2>
                </div>

                <span className="section-count">
                  {result.learningPath.length} modules
                </span>
              </div>

              <div className="module-list">
                {result.learningPath.map((module, index) => (
                  <article
                    className={`module-row ${
                      selectedModule === index ? "active" : ""
                    }`}
                    key={module.title}
                    onClick={() => setSelectedModule(index)}
                  >
                    <div className="module-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="module-content">
                      <div className="module-top">
                        <div>
                          <div className="module-title">
                            <h3>{module.title}</h3>

                            <span
                              className={`module-status ${
                                index === 0 ? "progress" : "upcoming"
                              }`}
                            >
                              {module.difficulty}
                            </span>
                          </div>

                          <p>{module.description}</p>
                        </div>

                        <strong className="module-percentage">
                          {module.estimatedTime}
                        </strong>
                      </div>

                      {selectedModule === index ? (
                        <div className="module-details">
                          <p className="details-label">KEY TOPICS</p>

                          <div className="skill-tags">
                            {module.topics.map((topic) => (
                              <span key={topic}>{topic}</span>
                            ))}
                          </div>

                          {module.practice.length > 0 ? (
                            <>
                              <p className="details-label">PRACTICE</p>

                              <ul>
                                {module.practice.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </>
                          ) : null}

                          {module.recommendedProjects.length > 0 ? (
                            <>
                              <p className="details-label">
                                RECOMMENDED PROJECTS
                              </p>

                              <ul>
                                {module.recommendedProjects.map((project) => (
                                  <li key={project}>{project}</li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {result.recommendedResources.length > 0 ||
            result.studyTips.length > 0 ? (
              <section className="learning-recommendation">
                <div className="recommendation-icon">✦</div>

                <div className="recommendation-content">
                  <p className="card-label">AI LEARNING RECOMMENDATION</p>

                  <h2>Resources and study tips</h2>

                  {result.finalAdvice ? <p>{result.finalAdvice}</p> : null}

                  {result.recommendedResources.length > 0 ? (
                    <>
                      <p className="details-label">RECOMMENDED RESOURCES</p>

                      <ul>
                        {result.recommendedResources.map((resource) => (
                          <li key={resource}>{resource}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {result.studyTips.length > 0 ? (
                    <>
                      <p className="details-label">STUDY TIPS</p>

                      <ul>
                        {result.studyTips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>

                <Link
                  href="/features/career/roadmap"
                  className="secondary-button"
                >
                  View Roadmap
                </Link>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="learning-action">
          <div>
            <p className="card-label">KEEP LEARNING</p>

            <h2>Build skills that move your career forward</h2>

            <p>
              Your learning path will evolve as your skills, goals, and target
              roles change.
            </p>
          </div>

          <div className="action-buttons">
            <Link href="/features/career/coach" className="secondary-button">
              Ask Career Coach
            </Link>

            <Link href="/features/career/roadmap" className="primary-button">
              View Roadmap
              <span>→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
