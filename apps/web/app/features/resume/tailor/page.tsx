"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { ResumeViewer } from "@/components/resume-viewer";
import { API_BASE_URL, getToken } from "@/lib/api";
import { tailoredToDocument } from "@/lib/resume-document";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { ResumeTailorResult } from "@/lib/types";

import "./tailor.css";

export default function ResumeTailorPage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const action = useAiAction<ResumeTailorResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;
  const improvements = result
    ? [
        ...result.improvementSummary.atsImprovements,
        ...result.improvementSummary.notes,
      ]
    : [];

  /**
   * The tailored resume is rendered and downloaded from the same response, so
   * the PDF is a true export of the preview rather than a second generation.
   * Nothing is saved over the user's primary resume.
   */
  async function downloadTailoredPdf() {
    if (!result) return;

    setDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/tailor/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken() ?? ""}`,
        },
        body: JSON.stringify({ tailoredResume: result }),
      });

      if (!response.ok) {
        throw new Error("We couldn't build your tailored PDF. Please try again.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `${result.title || "tailored-resume"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (caught) {
      setDownloadError(
        caught instanceof Error
          ? caught.message
          : "We couldn't build your tailored PDF. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="feature-page tailor-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">RESUME INTELLIGENCE</p>

            <h1>Resume Tailoring</h1>

            <p className="feature-description">
              Customize your resume for a specific job while keeping your
              experience and personal voice intact.
            </p>
          </div>

          <Link href="/features/resume/analysis" className="secondary-button">
            Resume Analysis
          </Link>
        </header>

        <AiToolPanel
          eyebrow="RESUME + JOB DESCRIPTION"
          title="Tailor your resume"
          description="Paste the job you are applying for and AI will rewrite your saved resume to match it."
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
                  ? "Using your saved resume."
                  : "You don't have a saved resume yet — upload one, or paste it here.",
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
          submitLabel="Tailor My Resume"
          onSubmit={() =>
            action.run("/api/resume/tailor", {
              resume: resume.text,
              jobDescription,
            })
          }
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        />

        {action.loading ? (
          <AiLoadingState label="Tailoring your resume…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No tailored resume yet"
            description="Paste a job description and generate a version of your resume optimized for that role."
          />
        ) : null}

        {result ? (
          <>
            <section className="target-job-card">
              <div className="target-job-info">
                <div className="job-icon">AI</div>

                <div>
                  <p className="card-label">TAILORED RESUME</p>

                  <h2>{result.title}</h2>

                  <p>Optimized for the job description you provided.</p>
                </div>
              </div>
            </section>

            {improvements.length > 0 ? (
              <section className="suggestions-card">
                <div className="section-header">
                  <div>
                    <p className="card-label">AI RECOMMENDATIONS</p>

                    <h2>What AI improved</h2>
                  </div>

                  <span className="suggestion-count">
                    {improvements.length} areas
                  </span>
                </div>

                <div className="suggestions-list">
                  {improvements.map((suggestion, index) => (
                    <article className="suggestion-item" key={suggestion}>
                      <span className="suggestion-number">{index + 1}</span>

                      <div>
                        <p>{suggestion}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="preview-card">
              <div className="section-header">
                <div>
                  <p className="card-label">PREVIEW</p>

                  <h2>Your tailored resume</h2>
                </div>

                <span className="preview-label">AI GENERATED</span>
              </div>

              {result.improvementSummary.remainingMissingKeywords.length >
              0 ? (
                <>
                  <p className="card-label" style={{ marginTop: 16 }}>
                    STILL MISSING KEYWORDS
                  </p>

                  <div className="ai-tag-list">
                    {result.improvementSummary.remainingMissingKeywords.map(
                      (keyword) => (
                        <span className="ai-tag muted" key={keyword}>
                          + {keyword}
                        </span>
                      )
                    )}
                  </div>
                </>
              ) : null}

              {/* Rendered with the same component as the saved resume, so a
                  tailored version is never formatted differently. */}
              <div className="card tailor-result-canvas">
                <ResumeViewer
                  resume={tailoredToDocument(result)}
                  showActions={false}
                />
              </div>

              {downloadError ? <p className="form-error">{downloadError}</p> : null}
            </section>

            <section className="tailor-action-card">
              <div>
                <p className="card-label">DOWNLOAD</p>

                <h2>Save your tailored resume</h2>

                <p>
                  Get a clean PDF of exactly what you see above, with your saved
                  contact details added automatically.
                </p>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={downloadTailoredPdf}
                disabled={downloading}
              >
                {downloading ? "Building PDF…" : "Download tailored PDF"}

                {downloading ? null : <span>→</span>}
              </button>
            </section>
          </>
        ) : null}

        <section className="tailor-action-card">
          <div>
            <p className="card-label">READY TO TAILOR?</p>

            <h2>Create your optimized resume</h2>

            <p>
              AI will analyze the target job and suggest improvements based on
              your existing experience.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              if (canRun) {
                void action.run("/api/resume/tailor", {
                  resume: resume.text,
                  jobDescription,
                });
              }
            }}
            disabled={!canRun}
          >
            Tailor My Resume
            <span>→</span>
          </button>
        </section>
      </div>
    </main>
  );
}
