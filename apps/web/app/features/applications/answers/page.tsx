"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { ApplicationAnswerResult } from "@/lib/types";

import "./answers.css";

export default function ApplicationAnswersPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const [question, setQuestion] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const action = useAiAction<ApplicationAnswerResult>();

  const result = action.data;

  useEffect(() => {
    if (result) {
      setAnswerDraft(result.answer);
    }
  }, [result]);

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    question.trim().length > 0 &&
    !action.loading;

  const copyAnswer = async () => {
    if (!answerDraft) {
      return;
    }

    try {
      await navigator.clipboard.writeText(answerDraft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="feature-page application-answers-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI APPLICATION TOOLS</p>

            <h1>Application Answers</h1>

            <p className="feature-description">
              Generate thoughtful, job-specific answers for application
              questions using your profile and the target role.
            </p>
          </div>

          <Link
            href="/features/applications/cover-letter"
            className="secondary-button"
          >
            Cover Letter
          </Link>
        </header>

        <section className="answers-intro-card">
          <div className="intro-icon">✦</div>

          <div>
            <p className="card-label">AI ANSWER ASSISTANT</p>

            <h2>Answer application questions faster</h2>

            <p>
              AI uses your resume, skills, experience, and the target job to
              create answers that sound relevant and natural.
            </p>
          </div>
        </section>

        <AiToolPanel
          eyebrow="QUESTION DETAILS"
          title="Generate an answer"
          description="Paste the application question plus the job description and AI will draft a tailored answer."
          fields={[
            {
              id: "resume",
              label: "Resume",
              value: resume.text,
              onChange: resume.setText,
              rows: 7,
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
              rows: 7,
              placeholder: "Paste the job description here…",
            },
            {
              id: "question",
              label: "Application Question",
              value: question,
              onChange: setQuestion,
              rows: 3,
              placeholder:
                "e.g. Why are you interested in this position?",
            },
          ]}
          submitLabel="Generate Answer"
          onSubmit={() =>
            action.run("/api/application/application-answer", {
              question,
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Drafting your answer…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No answer yet"
            description="Add a question and job description to generate a personalized answer you can edit and reuse."
          />
        ) : null}

        {result ? (
          <section className="questions-section">
            <div className="section-header">
              <div>
                <p className="card-label">GENERATED ANSWER</p>

                <h2>Review and personalize</h2>
              </div>

              <span className="section-count">
                {answerDraft.length} characters
              </span>
            </div>

            <article className="question-card">
              <div className="question-top">
                <div className="question-number">01</div>

                <div className="question-content">
                  <div className="question-meta">
                    <span>Question</span>
                  </div>

                  <h3>{result.question}</h3>
                </div>
              </div>

              <div className="answer-area">
                <textarea
                  value={answerDraft}
                  onChange={(event) => setAnswerDraft(event.target.value)}
                  rows={7}
                />

                <div className="answer-actions">
                  <span>{answerDraft.length} characters</span>

                  <button
                    type="button"
                    className="generate-answer-button"
                    onClick={copyAnswer}
                  >
                    <span>✦</span>
                    {copied ? "Copied" : "Copy Answer"}
                  </button>
                </div>
              </div>

              <div className="generated-note">
                <span>✓</span>
                AI-generated answer. Review and personalize it before
                submitting.
              </div>
            </article>
          </section>
        ) : null}

        <section className="answer-tips-card">
          <div className="tips-icon">✦</div>

          <div className="tips-content">
            <p className="card-label">AI TIP</p>

            <h2>Make every answer feel personal</h2>

            <p>
              AI gives you a strong starting point, but adding your own
              examples, numbers, and experiences will make the answer more
              authentic.
            </p>
          </div>

          <div className="tips-badge">Recommended</div>
        </section>

        <section className="answers-action">
          <div>
            <p className="card-label">NEXT STEP</p>

            <h2>Ready to continue your application?</h2>

            <p>
              Save your answers and use them while completing the application.
            </p>
          </div>

          <div className="action-buttons">
            <Link
              href="/features/applications/message"
              className="primary-button"
            >
              Application Message
              <span>→</span>
            </Link>

            <Link
              href="/features/applications/cover-letter"
              className="secondary-button"
            >
              Cover Letter
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
