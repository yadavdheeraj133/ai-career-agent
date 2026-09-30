"use client";

/**
 * Non-tailored resume generation.
 *
 * Deliberately separate from Resume Tailor: no job description is involved and
 * no AI writes anything. The server picks one approved template at random and
 * lays the user's own stored resume out in it, so every fact on screen is the
 * fact that was uploaded.
 */

import Link from "next/link";
import { useState } from "react";

import { ResumeViewer } from "@/components/resume-viewer";
import { API_BASE_URL, apiRequest, getToken } from "@/lib/api";
import type { ResumeDocument } from "@/lib/resume-document";
import { usePrimaryResume } from "@/lib/use-primary-resume";
import "../../section/dashboardSection.css";
import "./generate.css";

interface GeneratedTemplate {
  id: string;
  name: string;
  description: string;
}

interface GeneratedResume {
  template: GeneratedTemplate;
  document: ResumeDocument;
}

export default function ResumeGeneratePage() {
  const resume = usePrimaryResume();
  const [result, setResult] = useState<GeneratedResume | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(templateId?: string): Promise<void> {
    setGenerating(true);
    setError(null);

    try {
      const envelope = await apiRequest<GeneratedResume>("/resume/generate", {
        method: "POST",
        body: templateId ? { templateId } : {},
      });

      setResult(envelope.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "We couldn't generate a resume just now."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPdf(): Promise<void> {
    if (!result) return;

    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/resume/generate/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken() ?? ""}`,
        },
        body: JSON.stringify({ templateId: result.template.id }),
      });

      if (!response.ok) {
        throw new Error("We couldn't build the PDF just now.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const base =
        (result.document.title || "resume").replace(/[\\/:*?"<>|]+/g, " ").trim() ||
        "resume";

      anchor.href = url;
      anchor.download = `${base.replace(/\s+/g, "-").toLowerCase()}-${result.template.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "We couldn't build the PDF just now."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="feature-page dashboard-section-page resume-generate-page">
      <div className="section-container">
        <header className="section-header">
          <p className="section-eyebrow">RESUME</p>

          <h1>Generate Resume</h1>

          <p className="section-description">
            A professional, ATS-friendly resume built from your saved resume — no
            job description required. One approved layout is chosen at random,
            and your content is never rewritten, invented or overwritten.
          </p>

          <div className="resume-generate-toolbar">
            <Link href="/dashboard/resume" className="secondary-button">
              ← Back to resume
            </Link>
          </div>
        </header>

        {resume.loading ? (
          <p className="form-notice">Loading your resume…</p>
        ) : null}

        {!resume.loading && !resume.hasResume ? (
          <section className="resume-generate-empty">
            <p className="card-label">NO RESUME YET</p>

            <h2>Upload a resume to generate from</h2>

            <p>
              Generation uses your saved resume as its only source, so it needs
              one before it can build anything.
            </p>

            <Link href="/dashboard/resume/upload" className="primary-button">
              Upload Resume
            </Link>
          </section>
        ) : null}

        {resume.hasResume ? (
          <>
            <section className="resume-generate-action">
              <div>
                <p className="card-label">
                  {result ? "TEMPLATE IN USE" : "NON-TAILORED RESUME"}
                </p>

                <h2>{result ? result.template.name : "Generate a resume"}</h2>

                <p>
                  {result
                    ? result.template.description
                    : "Pick a clean, single-column layout with standard headings — the structure applicant tracking systems parse reliably — and fill it with your own data."}
                </p>
              </div>

              <div className="resume-generate-buttons">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void generate()}
                  disabled={generating}
                >
                  {generating
                    ? "Generating…"
                    : result
                      ? "Generate another"
                      : "Generate Resume"}
                </button>

                {result ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void downloadPdf()}
                    disabled={downloading}
                  >
                    {downloading ? "Building PDF…" : "Download PDF"}
                  </button>
                ) : null}
              </div>
            </section>

            {error ? <p className="form-error">{error}</p> : null}

            {result ? (
              <section className="resume-generate-result">
                <div className="resume-generate-result-head">
                  <p className="card-label">PREVIEW</p>

                  <span className="resume-generate-badge">
                    {result.template.name}
                  </span>
                </div>

                <div className="card resume-generate-canvas">
                  <ResumeViewer resume={result.document} showActions={false} />
                </div>

                <p className="resume-generate-note">
                  Built only from your saved resume: contact details, experience,
                  education, skills and every other fact are exactly as stored.
                </p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
