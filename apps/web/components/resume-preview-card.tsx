"use client";

import Link from "next/link";

import type { ResumeDocument } from "@/lib/resume-document";

import "./resume-preview-card.css";

interface ResumePreviewCardProps {
  resume: ResumeDocument;
}

export function ResumePreviewCard({ resume }: ResumePreviewCardProps) {
  const roleCount = resume.experience.length;

  const introParts = [resume.summary, resume.currentRole, resume.targetRole]
    .filter(Boolean)
    .join(" · ");

  const skillsList = resume.skills.slice(0, 5).join(", ");
  const fullIntro = introParts
    ? `${introParts}. Experience includes ${resume.experience.length} role${resume.experience.length === 1 ? "" : "s"} and ${resume.skills.length} skill${resume.skills.length === 1 ? "" : "s"}.`
    : `${resume.name || resume.title} brings expertise across ${resume.skills.length} skill${resume.skills.length === 1 ? "" : "s"}, including ${skillsList}, with experience spanning ${resume.experience.length} role${resume.experience.length === 1 ? "" : "s"}.`;

  return (
    <section className="card resume-preview">
      <div className="resume-preview-head">
        <p className="card-label">YOUR RESUME</p>
        <span className="resume-preview-badge">
          {roleCount} role{roleCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="resume-preview-body">
        <h2 className="resume-preview-name">{resume.name || resume.title}</h2>
        <p className="resume-preview-introduction">{fullIntro}</p>
      </div>

      <div className="resume-preview-actions">
        <Link href="/dashboard/resume/upload" className="resume-preview-secondary">
          Upload New
        </Link>
        <Link href="/dashboard/resume/view" className="primary-button">
          View Resume
        </Link>
      </div>
    </section>
  );
}
