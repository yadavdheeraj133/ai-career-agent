"use client";

/**
 * A short, non-editable summary of the user's saved resume for pages that are
 * about something else — the dashboard in particular. It links to the full
 * resume instead of restating it.
 */

import Link from "next/link";

import { resumeHeadline } from "@/lib/resume-document";
import type { ResumeDocument } from "@/lib/resume-document";

import "./resume-preview-card.css";

interface ResumePreviewCardProps {
  resume: ResumeDocument;
}

export function ResumePreviewCard({ resume }: ResumePreviewCardProps) {
  const contact = [resume.email, resume.phone, resume.location].filter(Boolean);

  return (
    <section className="card resume-preview">
      <div className="resume-preview-head">
        <div>
          <p className="card-label">YOUR RESUME</p>
          <h2>{resume.name || resume.title}</h2>
          <p className="resume-preview-filename">{resume.filename}</p>
        </div>
        <span className="resume-preview-badge">
          {resume.experience.length} role{resume.experience.length === 1 ? "" : "s"}
        </span>
      </div>

      {resume.currentRole ? (
        <p className="resume-preview-role">{resume.currentRole}</p>
      ) : null}

      {contact.length > 0 ? <p className="resume-preview-contact">{contact.join("  ·  ")}</p> : null}

      <p className="resume-preview-headline">
        {resumeHeadline(resume)} · {resume.skills.length} skills
      </p>

      <div className="resume-preview-actions">
        <Link href="/dashboard/resume/view" className="primary-button">
          View resume
        </Link>

        <Link href="/dashboard/resume/upload" className="resume-preview-secondary">
          Upload new
        </Link>
      </div>
    </section>
  );
}
