"use client";

/**
 * The canonical view of the user's resume.
 *
 * It renders the stored resume exactly as it is — the same document the AI
 * features read and the same component the dashboard preview uses — so this is
 * the one place a user needs to check what their resume actually says.
 */

import Link from "next/link";
import { useState } from "react";

import { ResumeViewer } from "@/components/resume-viewer";
import { API_BASE_URL, getToken } from "@/lib/api";
import { usePrimaryResume } from "@/lib/use-primary-resume";
import "../../section/dashboardSection.css";
import "./view.css";

export default function ResumeViewPage() {
  const resume = usePrimaryResume();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadOriginal() {
    if (!resume.meta?.hasOriginalFile) return;

    setDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/resume/file`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });

      if (!response.ok) {
        throw new Error("We couldn't download your original file.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = resume.meta.originalFileName || "resume";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (caught) {
      setDownloadError(
        caught instanceof Error ? caught.message : "We couldn't download your original file."
      );
    } finally {
      setDownloading(false);
    }
  }

  if (resume.loading) {
    return (
      <main className="feature-page resume-view-page">
        <div className="section-container">
          <p className="form-notice">Loading your resume…</p>
        </div>
      </main>
    );
  }

  if (resume.error) {
    return (
      <main className="feature-page resume-view-page">
        <div className="section-container">
          <p className="form-error">{resume.error}</p>

          <button type="button" className="secondary-button" onClick={resume.reload}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!resume.document) {
    return (
      <main className="feature-page resume-view-page">
        <div className="section-container">
          <header className="section-header">
            <p className="section-eyebrow">RESUME</p>

            <h1>No resume yet</h1>

            <p className="section-description">
              Upload your resume once and every feature on this workspace will
              read from it.
            </p>
          </header>

          <Link href="/dashboard/resume/upload" className="primary-button">
            Upload your resume
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="feature-page resume-view-page">
      <div className="section-container">
        <header className="section-header">
          <p className="section-eyebrow">RESUME</p>

          <h1>{resume.document.title}</h1>

          <p className="section-description">
            This is the resume every feature in your workspace reads from. It was
            {resume.meta?.uploadedAt
              ? ` uploaded on ${new Date(resume.meta.uploadedAt).toLocaleDateString()}`
              : " saved to your account"}
            .
          </p>

          <div className="resume-view-toolbar">
            {resume.meta?.hasOriginalFile ? (
              <button
                type="button"
                className="secondary-button"
                onClick={downloadOriginal}
                disabled={downloading}
              >
                {downloading ? "Downloading…" : "Download original file"}
              </button>
            ) : null}

            <Link href="/dashboard/resume/upload" className="secondary-button">
              Replace resume
            </Link>

            <Link href="/features/resume/tailor" className="primary-button">
              Tailor to a job
            </Link>
          </div>

          {downloadError ? <p className="form-error">{downloadError}</p> : null}
        </header>

        <div className="card resume-view-canvas">
          <ResumeViewer resume={resume.document} showActions={false} />
        </div>
      </div>
    </main>
  );
}
