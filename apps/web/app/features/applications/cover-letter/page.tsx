"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { CoverLetterResult } from "@/lib/types";

import "./coverLetter.css";

function letterToText(letter: CoverLetterResult): string {
  return [
    letter.greeting,
    "",
    letter.introduction,
    "",
    ...letter.body.flatMap((paragraph) => [paragraph, ""]),
    letter.closing,
    "",
    letter.signature,
  ].join("\n");
}

export default function CoverLetterPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const [copied, setCopied] = useState(false);
  const action = useAiAction<CoverLetterResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  const copyLetter = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(letterToText(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="feature-page cover-letter-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI APPLICATION TOOLS</p>

            <h1>Cover Letter</h1>

            <p className="feature-description">
              Create a personalized cover letter based on your resume,
              experience, and the job you want to apply for.
            </p>
          </div>

          <Link href="/features/resume/job-match" className="secondary-button">
            View Job Match
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Generate your cover letter"
          description="Add the job you are applying for and AI will write a tailored cover letter."
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
          submitLabel="Generate Cover Letter"
          onSubmit={() =>
            action.run("/api/application/cover-letter", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Writing your cover letter…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No cover letter yet"
            description="Add a job description and generate a cover letter tailored to that role."
          />
        ) : null}

        {result ? (
          <section className="generated-letter">
            <div className="letter-header">
              <div>
                <p className="card-label">GENERATED COVER LETTER</p>

                <h2>Your personalized letter</h2>
              </div>

              <button
                type="button"
                className="copy-button"
                onClick={copyLetter}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="letter-paper">
              <p>{result.greeting}</p>

              <p>{result.introduction}</p>

              {result.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}

              <p>{result.closing}</p>

              <p>
                {result.signature.split("\n").map((line, index) => (
                  <span key={index}>
                    {line}
                    {index < result.signature.split("\n").length - 1 ? (
                      <br />
                    ) : null}
                  </span>
                ))}
              </p>
            </div>

            <div className="letter-footer">
              <span>Generated with AI</span>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  action.run("/api/application/cover-letter", {
                    resume: resume.text,
                    jobDescription,
                  })
                }
                disabled={action.loading}
              >
                Regenerate
              </button>
            </div>
          </section>
        ) : null}

        <section className="cover-tips">
          <div className="tips-icon">✦</div>

          <div>
            <p className="card-label">AI TIP</p>

            <h2>Keep it specific to the job</h2>

            <p>
              A strong cover letter should connect your experience directly to
              the company and position instead of repeating your resume.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
