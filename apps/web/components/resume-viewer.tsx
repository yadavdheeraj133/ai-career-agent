"use client";

/**
 * The one structured resume renderer.
 *
 * Every place that shows resume content — the profile page, the full resume
 * page, the resume hub, the dashboard card and the tailored result — renders
 * through this component so a user's resume looks and reads the same
 * everywhere, and so no page has to re-derive structure from raw JSON.
 *
 * It renders only what the resume actually contains: empty sections are
 * omitted rather than filled with placeholder text.
 */

import Link from "next/link";
import { Fragment } from "react";

import {
  orderedSectionKeys,
  resumeDateRange,
  type ResumeDocument,
  type ResumeSectionKey,
} from "@/lib/resume-document";

import "./resume-viewer.css";

export type ResumeViewerVariant = "full" | "compact";

interface ResumeViewerProps {
  resume: ResumeDocument;
  /** `compact` shows the header and top sections for embedding in other pages. */
  variant?: ResumeViewerVariant;
  /** Hides the actions row; used where the page supplies its own. */
  showActions?: boolean;
  /** Label for the link to the full resume page. */
  viewAllHref?: string;
  viewAllLabel?: string;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rv-section">
      <h3 className="rv-section-title">{title}</h3>
      {children}
    </section>
  );
}

/** Links are user-supplied, so only http(s) values are ever rendered. */
function safeHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function LinkList({ links }: { links: string[] }) {
  const usable = links
    .map(safeHref)
    .filter((href): href is string => Boolean(href));

  if (usable.length === 0) return null;

  return (
    <ul className="rv-link-list">
      {usable.map((href) => (
        <li key={href}>
          <a href={href} target="_blank" rel="noopener noreferrer" className="rv-link">
            {href.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ResumeViewer({
  resume,
  variant = "full",
  showActions = true,
  viewAllHref = "/dashboard/resume/view",
  viewAllLabel = "View full resume",
}: ResumeViewerProps) {
  const compact = variant === "compact";
  const contact = [resume.email, resume.phone, resume.location].filter(Boolean);

  const hasExperience = resume.experience.length > 0;
  const hasEducation = resume.education.length > 0;
  const hasProjects = resume.projects.length > 0;
  const hasCertifications = resume.certifications.length > 0;
  const hasAchievements = resume.achievements.length > 0;
  const hasLanguages = resume.languages.length > 0;

  // A compact preview must stay short, so it leads with the header, summary and
  // skills and stops there.
  const limit = <T,>(items: T[], max: number) => (compact ? items.slice(0, max) : items);

  // Sections are built once and then laid out in the order the source document
  // recorded, so an uploaded resume reads the way the candidate wrote it.
  const sectionNodes: Record<ResumeSectionKey, React.ReactNode> = {
    summary: resume.summary ? (
      <Section title="Summary">
        <p className="rv-paragraph">{resume.summary}</p>
      </Section>
    ) : null,

    skills: resume.skills.length > 0 ? (
      <Section title="Skills">
        <ul className="rv-tag-list">
          {limit(resume.skills, 24).map((skill) => (
            <li key={skill} className="rv-tag">
              {skill}
            </li>
          ))}
        </ul>

        {compact && resume.skills.length > 24 ? (
          <p className="rv-more">+{resume.skills.length - 24} more skills</p>
        ) : null}
      </Section>
    ) : null,

    experience: hasExperience ? (
      <Section title="Experience">
        <ul className="rv-entries">
          {limit(resume.experience, compact ? 2 : resume.experience.length).map((entry, index) => {
            const range = resumeDateRange(entry.startDate, entry.endDate, entry.currentlyWorking);
            const meta = [range, entry.location].filter(Boolean).join("  ·  ");

            return (
              <li key={`${entry.company}-${entry.position}-${index}`} className="rv-entry">
                <h4 className="rv-entry-title">
                  {[entry.position, entry.company].filter(Boolean).join("  ·  ")}
                </h4>

                {meta ? <p className="rv-entry-meta">{meta}</p> : null}

                {entry.responsibilities.length > 0 ? (
                  <ul className="rv-bullets">
                    {entry.responsibilities.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        {compact && resume.experience.length > 2 ? (
          <p className="rv-more">
            +{resume.experience.length - 2} more roles
          </p>
        ) : null}
      </Section>
    ) : null,

    education: hasEducation ? (
      <Section title="Education">
        <ul className="rv-entries">
          {limit(resume.education, compact ? 2 : resume.education.length).map((entry, index) => {
            const meta = [
              entry.fieldOfStudy,
              entry.endDate || entry.startDate,
              entry.grade,
            ]
              .filter(Boolean)
              .join("  ·  ");

            return (
              <li key={`${entry.institution}-${entry.degree}-${index}`} className="rv-entry">
                <h4 className="rv-entry-title">
                  {[entry.degree, entry.institution].filter(Boolean).join("  ·  ")}
                </h4>

                {meta ? <p className="rv-entry-meta">{meta}</p> : null}
              </li>
            );
          })}
        </ul>
      </Section>
    ) : null,

    projects: hasProjects ? (
      <Section title="Projects">
        <ul className="rv-entries">
          {limit(resume.projects, compact ? 2 : resume.projects.length).map((entry, index) => (
            <li key={`${entry.name}-${index}`} className="rv-entry">
              <h4 className="rv-entry-title">{entry.name}</h4>

              {entry.description ? <p className="rv-paragraph">{entry.description}</p> : null}

              {entry.technologies.length > 0 ? (
                <ul className="rv-tag-list rv-tag-list-tight">
                  {entry.technologies.map((technology) => (
                    <li key={technology} className="rv-tag rv-tag-muted">
                      {technology}
                    </li>
                  ))}
                </ul>
              ) : null}

              {entry.links.length > 0 ? <LinkList links={entry.links} /> : null}
            </li>
          ))}
        </ul>
      </Section>
    ) : null,

    certifications: hasCertifications ? (
      <Section title="Certifications">
        <ul className="rv-plain-list">
          {resume.certifications.map((entry, index) => {
            const meta = [entry.issuer, entry.issueDate].filter(Boolean).join("  ·  ");

            return (
              <li key={`${entry.name}-${index}`}>
                <strong>{entry.name}</strong>
                {meta ? <span className="rv-entry-meta"> — {meta}</span> : null}
              </li>
            );
          })}
        </ul>
      </Section>
    ) : null,

    achievements: hasAchievements ? (
      <Section title="Achievements">
        <ul className="rv-plain-list">
          {resume.achievements.map((entry, index) => (
            <li key={`${entry.title}-${index}`}>
              {entry.title ? <strong>{entry.title}</strong> : null}
              {entry.title && entry.description ? " — " : null}
              {entry.description ? <span>{entry.description}</span> : null}
            </li>
          ))}
        </ul>
      </Section>
    ) : null,

    languages: hasLanguages ? (
      <Section title="Languages">
        <ul className="rv-tag-list">
          {resume.languages.map((language) => (
            <li key={language} className="rv-tag rv-tag-muted">
              {language}
            </li>
          ))}
        </ul>
      </Section>
    ) : null,
  };

  return (
    <article className={`rv rv-${variant}`} data-testid="resume-viewer">
      <header className="rv-header">
        <h1 className="rv-name">{resume.name || resume.title}</h1>

        {resume.currentRole ? <p className="rv-role">{resume.currentRole}</p> : null}

        {contact.length > 0 ? (
          <p className="rv-contact">{contact.join("  ·  ")}</p>
        ) : null}

        {resume.links.length > 0 ? <LinkList links={resume.links} /> : null}

        {showActions ? (
          <div className="rv-actions">
            <Link href={viewAllHref} className="rv-action-link">
              {viewAllLabel}
            </Link>
            <Link href="/dashboard/resume/upload" className="rv-action-link">
              Replace resume
            </Link>
          </div>
        ) : null}
      </header>

      {orderedSectionKeys(resume.sectionOrder).map((key) => (
        <Fragment key={key}>{sectionNodes[key]}</Fragment>
      ))}
    </article>
  );
}
