"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { invalidatePrimaryResume } from "@/lib/use-primary-resume";
import type { AtsGateStatus, Resume } from "@/lib/types";
import "../../section/dashboardSection.css";
import "./upload.css";

interface AtsCheckResponse extends AtsGateStatus {
  result: { overallScore: number };
}

export default function ResumeUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const [gate, setGate] = useState<AtsGateStatus | null>(null);
  const [gateLoading, setGateLoading] = useState(true);
  const [jobDescription, setJobDescription] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  async function loadGate() {
    try {
      const response = await apiRequest<AtsGateStatus>("/resume/ats-status");
      setGate(response.data);
    } catch {
      setGate(null);
    } finally {
      setGateLoading(false);
    }
  }

  useEffect(() => {
    void loadGate();
  }, []);

  async function uploadResume() {
    if (!file) {
      setStatus("error");
      setMessage("Choose a PDF, DOC, or DOCX file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setStatus("uploading");
    setMessage("Extracting your resume…");

    try {
      await apiRequest<Resume>("/resume/upload", {
        method: "POST",
        body: formData,
      });
      setStatus("success");
      setMessage("Resume uploaded and profile data extracted successfully.");
      // The stored resume just changed, so every surface reading the canonical
      // document has to pick up the new one rather than a cached copy.
      invalidatePrimaryResume();
      // A replacement upload clears any previous ATS score; reload gate state.
      await loadGate();
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : "Unable to process your resume.");
    }
  }

  async function runAtsCheck() {
    if (!jobDescription.trim() || checking) return;

    setChecking(true);
    setCheckError(null);

    try {
      const response = await apiRequest<AtsCheckResponse>("/resume/ats-check", {
        method: "POST",
        body: { jobDescription: jobDescription.trim() },
      });
      setGate(response.data);
    } catch (caught) {
      setCheckError(
        caught instanceof Error ? caught.message : "Unable to run the ATS check."
      );
    } finally {
      setChecking(false);
    }
  }

  const showGate = gate?.hasResume === true;

  return (
    <main className="feature-page dashboard-section-page resume-upload-page">
      <div className="section-container">
        <header className="section-header">
          <Link href="/dashboard/resume" className="upload-back-link">← Resume</Link>
          <p className="section-eyebrow">RESUME</p>
          <h1>Upload Resume</h1>
          <p className="section-description">
            Upload your resume to extract the career information already present in it.
          </p>
        </header>

        <section className="resume-upload-card">
          <label htmlFor="resume-file">Resume file</label>
          <input
            id="resume-file"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setStatus("idle");
              setMessage("");
            }}
          />
          <p className="upload-file-note">PDF, DOC or DOCX, up to 10 MB.</p>
          {file ? <p className="upload-selected-file">Selected: {file.name}</p> : null}
          <button type="button" className="primary-button" onClick={() => void uploadResume()} disabled={status === "uploading"}>
            {status === "uploading" ? "Processing…" : "Upload Resume"}
          </button>
          {message ? <p className={`upload-message ${status}`}>{message}</p> : null}
          {status === "success" ? <Link href="/profile" className="upload-profile-link">View Career Profile →</Link> : null}
        </section>

        {gateLoading ? (
          <section className="resume-upload-card">
            <p className="upload-file-note">Checking your ATS status…</p>
          </section>
        ) : null}

        {!gateLoading && showGate && gate ? (
          <section className="resume-upload-card" aria-label="ATS onboarding check">
            <label>ATS Check — {gate.threshold}% required to continue</label>

            {gate.atsScore !== null ? (
              <p className={`upload-message ${gate.passed ? "success" : "error"}`}>
                {gate.passed
                  ? `ATS score ${gate.atsScore}/100 — passed. You can continue onboarding.`
                  : `ATS score ${gate.atsScore}/100 — below the required ${gate.threshold}%. Improve your resume and check again.`}
              </p>
            ) : (
              <p className="upload-file-note">
                Your resume is on file. Paste a target job description and run the ATS check to continue.
              </p>
            )}

            <label htmlFor="ats-job-description">Target job description</label>
            <textarea
              id="ats-job-description"
              className="upload-textarea"
              rows={6}
              placeholder="Paste the job description you are targeting…"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
            />

            <button
              type="button"
              className="primary-button"
              onClick={() => void runAtsCheck()}
              disabled={checking || jobDescription.trim().length === 0}
            >
              {checking ? "Analyzing…" : "Check ATS Score"}
            </button>

            {checking ? (
              <p className="upload-file-note">Analyzing your resume against the job description…</p>
            ) : null}

            {checkError ? <p className="upload-message error">{checkError}</p> : null}

            {gate.passed ? (
              <Link href="/skill" className="upload-profile-link">Continue to Skills →</Link>
            ) : null}

            {!gate.passed && gate.atsScore !== null ? (
              <p className="upload-file-note">
                Tip: tailor your resume with the missing keywords, re-upload it above, then run the check again.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
