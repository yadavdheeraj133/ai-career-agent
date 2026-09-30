/**
 * The canonical resume shape returned by `GET /resume/document`.
 *
 * These mirror `apps/api/src/services/resume-document.service.ts`. The server
 * owns normalization; the web app renders what it is given rather than
 * re-deriving structure, so the viewer, the PDF and the AI tools can never
 * disagree about what the user's resume says.
 */

export interface ResumeExperience {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  responsibilities: string[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  links: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  issueDate: string;
  credentialId: string;
  credentialUrl: string;
}

export interface ResumeAchievement {
  title: string;
  description: string;
}

/** The sections a document can carry, in their default rendering order. */
export const RESUME_SECTION_KEYS = [
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
  "certifications",
  "achievements",
  "languages",
] as const;

export type ResumeSectionKey = (typeof RESUME_SECTION_KEYS)[number];

export interface ResumeDocument {
  title: string;
  name: string | null;
  filename: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  currentRole: string | null;
  targetRole: string | null;
  links: string[];
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
  achievements: ResumeAchievement[];
  languages: string[];
  /**
   * Order the sections appear in the source document, so an uploaded resume is
   * shown the way the candidate wrote it. Missing on documents that never
   * recorded one — the viewer then falls back to `RESUME_SECTION_KEYS`.
   */
  sectionOrder?: ResumeSectionKey[];
}

function isSectionKey(value: unknown): value is ResumeSectionKey {
  return (
    typeof value === "string" &&
    (RESUME_SECTION_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Section keys in the order to render them: whatever the document recorded
 * first (unknown or repeated entries dropped), then everything it left out in
 * the default order. Callers never handle a partial list.
 */
export function orderedSectionKeys(
  sectionOrder?: ResumeSectionKey[]
): ResumeSectionKey[] {
  const ordered: ResumeSectionKey[] = [];
  const seen = new Set<ResumeSectionKey>();

  for (const key of sectionOrder ?? []) {
    if (!isSectionKey(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }

  for (const key of RESUME_SECTION_KEYS) {
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }

  return ordered;
}

export interface ResumeMeta {
  id: string;
  title: string;
  originalFileName: string | null;
  uploadedAt: string | null;
  fileSize: number | null;
  hasOriginalFile: boolean;
}

export interface PrimaryResume {
  document: ResumeDocument;
  /** Rendered server-side from `document`, so AI input matches what is shown. */
  plainText: string;
  meta: ResumeMeta | null;
}

/** Only the header fields a compact preview needs. */
export function resumeHeadline(document: ResumeDocument): string {
  return document.currentRole || document.name || document.title;
}

export function resumeDateRange(
  startDate: string,
  endDate: string,
  currentlyWorking = false
): string {
  const to = currentlyWorking ? "Present" : endDate;
  if (startDate && to) return `${startDate} – ${to}`;
  return startDate || to || "";
}

/** True when the resume has enough content to be worth rendering or tailoring. */
export function hasResumeContent(document: ResumeDocument): boolean {
  return Boolean(
    document.summary ||
      document.skills.length ||
      document.experience.length ||
      document.education.length ||
      document.projects.length ||
      document.certifications.length ||
      document.achievements.length
  );
}

/**
 * The subset of a tailored result the viewer needs.
 *
 * The tailor schema is intentionally flatter than the canonical document (plain
 * strings for certifications and achievements, a `graduationDate` for education),
 * so it is mapped into the canonical shape here rather than duplicating the
 * viewer. The PDF endpoint applies the same mapping server-side, so what is
 * previewed here and what is downloaded cannot drift apart.
 */
export interface TailoredResume {
  title: string;
  summary: string;
  skills: string[];
  languages: string[];
  links: string[];
  experience: {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    responsibilities: string[];
  }[];
  education: { degree: string; institution: string; graduationDate: string }[];
  projects: { name: string; description: string }[];
  certifications: string[];
  achievements: string[];
}

export function tailoredToDocument(tailored: TailoredResume): ResumeDocument {
  return {
    title: tailored.title,
    name: null,
    filename: null,
    email: null,
    phone: null,
    location: null,
    currentRole: tailored.experience[0]?.position ?? null,
    targetRole: null,
    links: tailored.links,
    summary: tailored.summary,
    skills: tailored.skills,
    experience: tailored.experience.map((entry) => ({
      company: entry.company,
      position: entry.position,
      location: "",
      startDate: entry.startDate,
      endDate: entry.endDate,
      currentlyWorking: false,
      responsibilities: entry.responsibilities,
    })),
    education: tailored.education.map((entry) => ({
      institution: entry.institution,
      degree: entry.degree,
      fieldOfStudy: "",
      startDate: "",
      endDate: entry.graduationDate,
      grade: "",
    })),
    projects: tailored.projects.map((entry) => ({
      name: entry.name,
      description: entry.description,
      technologies: [],
      links: [],
    })),
    certifications: tailored.certifications.map((name) => ({
      name,
      issuer: "",
      issueDate: "",
      credentialId: "",
      credentialUrl: "",
    })),
    achievements: tailored.achievements.map((line) => ({ title: "", description: line })),
    languages: tailored.languages,
  };
}
