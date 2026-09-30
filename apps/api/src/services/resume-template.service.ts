/**
 * The pool of approved layouts a non-tailored resume is generated from.
 *
 * A non-tailored resume is not an AI product: the candidate's stored resume is
 * already the content, so generation is a layout decision. Each template below
 * only describes *how* that content is presented — section order and typographic
 * treatment — and never what the content says. Nothing here writes to the
 * database: a generated resume is a view over the primary resume, exactly like
 * the tailored one, so the uploaded resume stays the single source of truth.
 *
 * Every template is single column with standard, machine-readable section
 * headings, no tables, no text boxes and no header/footer content, which is the
 * shape applicant tracking systems parse reliably. The pool is deliberately
 * conservative: a layout that looks distinctive on screen is rarely worth an ATS
 * silently dropping a section.
 */

import type { ResumeDocument, ResumeSectionKey } from "./resume-document.service.js";

export type ResumeHeadingStyle = "rule" | "underline" | "plain";
export type ResumeEntryStyle = "inline" | "stacked";
export type ResumeNameAlign = "left" | "center";

export interface ResumeTemplateStyle {
  /** How section headings are drawn: rule above, rule below, or plain label. */
  heading: ResumeHeadingStyle;
  /** Heading fill colour, or `null` for plain black. */
  headingColor: [number, number, number] | null;
  /** Alignment of the name block. */
  nameAlign: ResumeNameAlign;
  nameSize: number;
  /** Bullet glyph used for responsibilities. */
  bullet: string;
  /** Separator between contact fields and entry metadata. */
  separator: string;
  /** Role/company on one line, or the role stacked above the company. */
  entry: ResumeEntryStyle;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  sectionOrder: ResumeSectionKey[];
  style: ResumeTemplateStyle;
}

/** The layout used when no template is supplied (the tailored-resume PDF). */
const DEFAULT_STYLE: ResumeTemplateStyle = {
  heading: "rule",
  headingColor: null,
  nameAlign: "left",
  nameSize: 19,
  bullet: "•",
  separator: "  |  ",
  entry: "inline",
};

/**
 * The approved pool. Order here is irrelevant — selection is random — but the
 * entries are listed in a stable sequence so review diffs stay readable.
 */
export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: "classic-professional",
    name: "Classic Professional",
    description:
      "The conservative standard: summary, work history and education first, with ruled section headings.",
    sectionOrder: ["summary", "experience", "education", "skills", "projects", "certifications", "achievements", "languages"],
    style: { ...DEFAULT_STYLE },
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description:
      "Plain headings with no rules and a skill block up top, for a lighter read on screen.",
    sectionOrder: ["summary", "skills", "experience", "education", "projects", "certifications", "achievements", "languages"],
    style: {
      ...DEFAULT_STYLE,
      heading: "plain",
      nameSize: 18,
      separator: "  ·  ",
    },
  },
  {
    id: "executive-focus",
    name: "Executive Focus",
    description:
      "Leads with impact: work history, then achievements and credentials, under a larger name block.",
    sectionOrder: ["summary", "experience", "achievements", "skills", "education", "certifications", "projects", "languages"],
    style: {
      ...DEFAULT_STYLE,
      headingColor: [0.16, 0.13, 0.34],
      nameSize: 21,
      entry: "stacked",
    },
  },
  {
    id: "technical-specialist",
    name: "Technical Specialist",
    description:
      "Skills and projects ahead of the chronology, with a compact underlined heading style.",
    sectionOrder: ["summary", "skills", "projects", "experience", "education", "certifications", "achievements", "languages"],
    style: {
      ...DEFAULT_STYLE,
      heading: "underline",
      nameSize: 18,
      separator: "  ·  ",
      bullet: "-",
    },
  },
  {
    id: "compact-one-page",
    name: "Compact One Page",
    description:
      "Dense and economical: smaller type and plain headings to keep long resumes on fewer pages.",
    sectionOrder: ["experience", "skills", "education", "projects", "certifications", "summary", "achievements", "languages"],
    style: {
      ...DEFAULT_STYLE,
      heading: "plain",
      nameSize: 17,
      separator: " | ",
    },
  },
  {
    id: "centered-header",
    name: "Centered Header",
    description:
      "A centered name block over a classic single column, with roomier heading rules.",
    sectionOrder: ["summary", "experience", "skills", "education", "certifications", "projects", "achievements", "languages"],
    style: {
      ...DEFAULT_STYLE,
      nameAlign: "center",
      nameSize: 20,
      headingColor: [0.24, 0.19, 0.55],
      entry: "stacked",
      separator: "  ·  ",
    },
  },
  {
    id: "education-first",
    name: "Education First",
    description:
      "Education and coursework lead, then skills and projects — the usual order for a first role.",
    sectionOrder: ["education", "summary", "skills", "projects", "experience", "certifications", "achievements", "languages"],
    style: {
      ...DEFAULT_STYLE,
      heading: "underline",
      nameSize: 18,
    },
  },
  {
    id: "project-led",
    name: "Project Led",
    description:
      "Projects and technical skills ahead of employment history, for portfolio-driven applications.",
    sectionOrder: ["summary", "projects", "skills", "experience", "education", "certifications", "achievements", "languages"],
    style: {
      ...DEFAULT_STYLE,
      heading: "plain",
      headingColor: [0.18, 0.2, 0.38],
      nameSize: 18,
      entry: "stacked",
      separator: "  ·  ",
    },
  },
  {
    id: "credential-forward",
    name: "Credential Forward",
    description:
      "Certifications and licences surface immediately after the summary, then the work history.",
    sectionOrder: ["summary", "certifications", "experience", "skills", "education", "projects", "achievements", "languages"],
    style: {
      ...DEFAULT_STYLE,
      nameAlign: "center",
      nameSize: 19,
      entry: "stacked",
      bullet: "-",
    },
  },
];

/** Every id in the pool, for callers that need to validate a selection. */
const BY_ID = new Map(RESUME_TEMPLATES.map((template) => [template.id, template]));

export function getResumeTemplate(id: unknown): ResumeTemplate | null {
  return typeof id === "string" ? BY_ID.get(id) ?? null : null;
}

/**
 * Uniformly random pick from the pool. `Math.random` is enough here: the choice
 * is cosmetic, so a biased draw would cost the user nothing.
 */
export function pickRandomResumeTemplate(
  random: () => number = Math.random
): ResumeTemplate {
  const index = Math.min(
    RESUME_TEMPLATES.length - 1,
    Math.floor(random() * RESUME_TEMPLATES.length)
  );

  return RESUME_TEMPLATES[index] ?? RESUME_TEMPLATES[0]!;
}

/**
 * Applies a template's section order to a document without touching its
 * content: every field, entry and word is the user's own. The stored resume is
 * never written back — this is a derived view.
 */
export function applyResumeTemplate(
  document: ResumeDocument,
  template: ResumeTemplate
): ResumeDocument {
  return { ...document, sectionOrder: [...template.sectionOrder] };
}

/** The template information a client needs, without the rendering style. */
export function publicTemplate(template: ResumeTemplate) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    sectionOrder: [...template.sectionOrder],
  };
}

export { DEFAULT_STYLE as DEFAULT_TEMPLATE_STYLE };
