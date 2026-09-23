"use client";

import Link from "next/link";
import { useState } from "react";

import { apiRequest } from "@/lib/api";
import type { Resume } from "@/lib/types";
import "../../section/dashboardSection.css";
import "./upload.css";

export default function ResumeUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

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
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : "Unable to process your resume.");
    }
  }

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
      </div>
    </main>
  );
}