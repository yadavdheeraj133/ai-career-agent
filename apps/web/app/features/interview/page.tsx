"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type {
  InterviewPreparationResult,
  InterviewQuestion,
} from "@/lib/types";

import "./interview.css";

interface QuestionGroup {
  title: string;
  description: string;
  questions: InterviewQuestion[];
}

function QuestionList({ questions }: { questions: InterviewQuestion[] }) {
  if (questions.length === 0) {
    return <p className="ai-field-hint">No questions were returned.</p>;
  }

  return (
    <div className="preparation-list">
      {questions.map((item, index) => (
        <article className="preparation-row" key={item.question}>
          <div className="area-number">
            {String(index + 1).padStart(2, "0")}
          </div>

          <div className="area-content">
            <div className="area-title-row">
              <h3>{item.question}</h3>
            </div>

            <p>{item.reason}</p>

            <details className="interview-answer">
              <summary>Sample answer</summary>

              <p>{item.sampleAnswer}</p>

              {item.followUpQuestions.length > 0 ? (
                <>
                  <p className="ai-field-label">Follow-up questions</p>

                  <ul>
                    {item.followUpQuestions.map((followUp) => (
                      <li key={followUp}>{followUp}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </details>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function InterviewPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const action = useAiAction<InterviewPreparationResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  const groups: QuestionGroup[] = result
    ? [
        {
          title: "Technical Questions",
          description: "Questions based on the technologies in the role.",
          questions: result.technicalQuestions,
        },
        {
          title: "Behavioral Questions",
          description: "Teamwork, communication, and challenge questions.",
          questions: result.behavioralQuestions,
        },
        {
          title: "Project Questions",
          description: "Questions about the projects on your resume.",
          questions: result.projectQuestions,
        },
        {
          title: "Resume Questions",
          description: "Questions an interviewer may ask about your resume.",
          questions: result.resumeQuestions,
        },
      ]
    : [];

  return (
    <main className="feature-page interview-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI INTERVIEW INTELLIGENCE</p>

            <h1>Interview Preparation</h1>

            <p className="feature-description">
              Prepare for your target role with AI-generated questions,
              practice areas, and personalized interview guidance.
            </p>
          </div>

          <Link
            href="/features/applications/message"
            className="secondary-button"
          >
            Application Tools
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Prepare for your interview"
          description="Paste the job description and your resume to generate a personalized interview plan."
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
              id: "jobDescription",
              label: "Job Description",
              value: jobDescription,
              onChange: setJobDescription,
              rows: 8,
              placeholder: "Paste the job description here…",
            },
          ]}
          submitLabel="Generate Interview Plan"
          onSubmit={() =>
            action.run("/api/interview/prepare", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Building your interview plan…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No interview plan yet"
            description="Add a job description and run the preparation to see likely questions, focus areas, and tips."
          />
        ) : null}

        {result ? (
          <>
            <section className="preparation-overview">
              <div className="overview-main">
                <div className="ai-icon">✦</div>

                <div>
                  <p className="card-label">AI INTERVIEW ANALYSIS</p>

                  <h2>Your interview overview</h2>

                  <p>{result.overview}</p>
                </div>
              </div>

              <div className="readiness-score">
                <span>Difficulty</span>

                <strong>{result.interviewDifficulty}</strong>
              </div>
            </section>

            <section className="topics-card">
              <div className="section-header">
                <div>
                  <p className="card-label">KEY FOCUS AREAS</p>

                  <h2>What to focus on</h2>
                </div>

                <span className="section-count">
                  {result.keyFocusAreas.length} areas
                </span>
              </div>

              <div className="topic-tags">
                {result.keyFocusAreas.map((topic) => (
                  <span key={topic}>{topic}</span>
                ))}
              </div>
            </section>

            {groups.map((group) => (
              <section className="preparation-section" key={group.title}>
                <div className="section-header">
                  <div>
                    <p className="card-label">QUESTIONS</p>

                    <h2>{group.title}</h2>

                    <p className="ai-field-hint">{group.description}</p>
                  </div>

                  <span className="section-count">
                    {group.questions.length} questions
                  </span>
                </div>

                <QuestionList questions={group.questions} />
              </section>
            ))}

            {result.weakAreas.length > 0 ? (
              <section className="topics-card">
                <div className="section-header">
                  <div>
                    <p className="card-label">WEAK AREAS</p>

                    <h2>Areas to strengthen</h2>
                  </div>
                </div>

                <div className="topic-tags">
                  {result.weakAreas.map((area) => (
                    <span key={area}>{area}</span>
                  ))}
                </div>
              </section>
            ) : null}

            {result.preparationTips.length > 0 ? (
              <section className="interview-tips">
                <div className="tips-icon">✦</div>

                <div>
                  <p className="card-label">PREPARATION TIPS</p>

                  <h2>How to prepare</h2>

                  <ul>
                    {result.preparationTips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <section className="interview-action">
          <div>
            <p className="card-label">NEXT STEP</p>

            <h2>Strengthen your weakest areas</h2>

            <p>
              Use your skill gaps and career roadmap to prepare for
              the technologies you need to improve.
            </p>
          </div>

          <div className="action-buttons">
            <Link
              href="/features/ai-tools/missing-skills"
              className="secondary-button"
            >
              View Missing Skills
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
