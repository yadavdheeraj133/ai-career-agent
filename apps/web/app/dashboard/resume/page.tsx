"use client";

import Link from "next/link";

import { usePrimaryResume } from "@/lib/use-primary-resume";
import "../section/dashboardSection.css";

const items = [
  {
    href: "/dashboard/resume/upload",
    icon: "↑",
    title: "Upload Resume",
    description:
      "Upload a PDF, DOC or DOCX resume to build your career profile.",
  },
  {
    href: "/dashboard/resume/generate",
    icon: "❖",
    title: "Generate Resume",
    description:
      "Build a clean, ATS-friendly resume from your saved data — no job description needed.",
  },
  {
    href: "/features/resume/analysis",
    icon: "✎",
    title: "Resume Analysis",
    description:
      "Get an overall quality review of your resume and actionable improvement tips.",
  },
  {
    href: "/features/resume/ats",
    icon: "▦",
    title: "ATS Score",
    description:
      "Check how well your resume clears applicant tracking systems for a job.",
  },
  {
    href: "/features/resume/skill-gap",
    icon: "◇",
    title: "Skill Gap",
    description:
      "Compare your existing skills against a job description and find gaps.",
  },
  {
    href: "/features/resume/tailor",
    icon: "✂",
    title: "Resume Tailor",
    description:
      "Tailor your resume to a specific job while keeping every fact accurate.",
  },
  {
    href: "/features/resume/job-match",
    icon: "◎",
    title: "Resume ↔ Job Match",
    description:
      "See a skill-by-skill compatibility summary between your resume and a role.",
  },
];

export default function ResumeSectionPage() {
  const resume = usePrimaryResume();

  return (
    <main className="feature-page dashboard-section-page">
      <div className="section-container">
        <header className="section-header">
          <p className="section-eyebrow">WORKSPACE</p>

          <h1>Resume</h1>

          <p className="section-description">
            Understand, improve and tailor your resume so it performs
            well for every application you send.
          </p>
        </header>

        {/* A compact state only: the full resume lives behind its own view, so
            opening this page never dumps the whole document on the user. */}
        {resume.document ? (
          <section className="card resume-hub-current is-compact">
            <div className="resume-hub-current-head">
              <div>
                <p className="card-label">CURRENT RESUME</p>
                <h2>{resume.document.title}</h2>
                <p className="resume-hub-filename">{resume.document.filename}</p>
              </div>

              <Link
                href="/dashboard/resume/view"
                className="primary-button resume-hub-open"
              >
                Open to Full View
              </Link>
            </div>
          </section>
        ) : null}

        <div className="section-card-grid">
          {items.map((item) => (
            <Link href={item.href} className="section-link-card" key={item.title}>
              <span className="section-link-icon">{item.icon}</span>

              <span className="section-link-content">
                <h2>{item.title}</h2>

                <p>{item.description}</p>
              </span>

              <span className="section-link-arrow">→</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}