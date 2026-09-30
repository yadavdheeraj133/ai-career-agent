import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

import {
  toResumeDocument,
  type ResumeDocument,
  type ResumeSectionKey,
} from "./resume-document.service.js";

/**
 * Turns uploaded PDF/DOC/DOCX bytes into the canonical `ResumeDocument`.
 *
 * The flat `ExtractedResumeProfile` shape is still produced for `parsedProfile`
 * because the web profile page and older rows read it; it is a projection of the
 * same extraction, not a second parse.
 */

export interface ExtractedResumeProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
  achievements: string[];
  languages: string[];
  links: string[];
  currentRole: string | null;
  targetRole: string | null;
  summary: string | null;
  /** Where each section sat in the source file, so display order can match it. */
  sectionOrder: ResumeSectionKey[];
}

const PAGE_ARTIFACTS = /^(?:page\s+\d+(?:\s+of\s+\d+)?|\d+(?:\s*\/\s*\d+)?)$/i;
const SECTION_NAMES: Record<keyof Pick<ResumeDocument, "summary" | "skills" | "experience" | "education" | "projects" | "certifications" | "achievements" | "languages">, string[]> = {
  summary: ["summary", "professional summary", "profile", "objective", "about", "about me"],
  skills: ["skills", "technical skills", "core skills", "technologies", "tech stack", "competencies"],
  experience: ["experience", "work experience", "professional experience", "employment", "work history", "career history"],
  education: ["education", "academic background", "academic qualifications", "qualifications"],
  projects: ["projects", "personal projects", "academic projects", "selected projects"],
  certifications: ["certifications", "certificates", "licenses", "licences"],
  achievements: ["achievements", "awards", "honors", "honours", "accomplishments"],
  languages: ["languages", "language proficiency"],
};

type SectionKey = keyof typeof SECTION_NAMES;

const ALL_SECTIONS: SectionKey[] = Object.keys(SECTION_NAMES) as SectionKey[];

function clean(value: string): string {
  return value.replace(/[ \t ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** A heading is a short, title-ish line, however the resume chose to capitalise it. */
function isHeading(line: string): boolean {
  if (!line || line.length > 60) return false;
  // Date ranges are entry metadata, never a section boundary.
  if (/\d{4}/.test(line)) return false;
  // Headings are labels, not sentences; a long all-caps bullet is content.
  if (line.trim().split(/\s+/).length > 6) return false;

  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length === 0) return false;

  const allCaps = letters === letters.toUpperCase() && letters.length > 1;
  // Matched against the line, not the stripped letters, so a multi-word heading
  // is not mistaken for a single long word.
  const titleCase = /^[A-Z][a-zA-Z'&/-]*(\s+[A-Z][a-zA-Z'&/-]*)*$/.test(line.trim());

  return allCaps || titleCase;
}

function normalizeHeading(value: string): string {
  return value.toLowerCase().replace(/[\s:|•·]+/g, " ").trim();
}

function matchesSection(line: string, names: string[]): boolean {
  const normalized = normalizeHeading(line);

  return names.some((name) => {
    const candidate = normalizeHeading(name);

    if (normalized === candidate) return true;
    if (!normalized.startsWith(`${candidate} `)) return false;

    // A short qualifier is part of the heading ("Skills & Tools"), but a list of
    // values is content ("Languages: Python, Go") that merely begins with the
    // section word and must not steal the previous section's lines.
    const remainder = normalized.slice(candidate.length + 1);

    return (
      remainder.length > 0 &&
      remainder.length <= 40 &&
      !/[,;|]/.test(remainder) &&
      remainder.split(" ").length <= 4
    );
  });
}

interface SplitLines {
  lines: string[];
  sections: Partial<Record<SectionKey, string[]>>;
  /** Section keys in the order the document introduced them. */
  order: SectionKey[];
}

function splitLines(text: string): SplitLines {
  // Leading bullet markers are deliberately preserved: they are the only signal
  // that a line continues the entry above it rather than starting a new one.
  // Only whole-line page-number artifacts are dropped — trimming trailing digits
  // would eat the year off a date range such as "Jun 2018 - Feb 2021".
  const lines = text
    .split(/\r?\n/)
    .map((line) => clean(line))
    .filter((line) => line && !PAGE_ARTIFACTS.test(line));

  const sections: Partial<Record<SectionKey, string[]>> = {};
  const order: SectionKey[] = [];
  let current: SectionKey | null = null;

  for (const line of lines) {
    const matched = ALL_SECTIONS.find((key) => matchesSection(line, SECTION_NAMES[key]));

    if (matched) {
      current = matched;
      if (!sections[matched]) {
        sections[matched] = [];
        order.push(matched);
      }
      continue;
    }

    if (isHeading(line)) {
      current = null;
      continue;
    }

    if (current) {
      (sections[current] as string[]).push(line);
    }
  }

  return { lines, sections, order };
}

function labeled(lines: string[], labels: string[]): string | null {
  for (const line of lines) {
    const match = line.match(new RegExp(`^(?:${labels.join("|")})\\s*[:|-]\\s*(.+)$`, "i"));
    if (match?.[1]) return clean(match[1]);
  }
  return null;
}

/**
 * Splits a skills block into individual skills. Comma, semicolon, bullet and
 * pipe are all treated as separators, and a leading category label is dropped
 * so grouped lines like "Languages: Python, Go" do not leak their label into the
 * skill list. The label pattern is letters-only, so entries that are themselves
 * symbol-prefixed ("C++: 17") keep their prefix.
 */
function splitSkills(lines: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const withoutLabel = line
      .replace(/^\s*[A-Za-z][A-Za-z &]*:\s*/, "")
      .replace(/^\s*(?:technical\s+|core\s+|key\s+)?skills?\s*[:|-]\s*/i, "");
    const parts = withoutLabel.split(/[,;|•·]|\s\/\s/);

    for (const part of parts) {
      const skill = clean(part).replace(/^[-–—:]+/, "").trim();
      const key = skill.toLowerCase();

      if (skill && skill.length <= 60 && !seen.has(key)) {
        seen.add(key);
        result.push(skill);
      }
    }
  }

  return result.slice(0, 100);
}

function unique(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const item = clean(value);
    const key = item.toLowerCase();

    if (item && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }

    if (result.length >= limit) break;
  }

  return result;
}

function collectLinks(text: string): string[] {
  const found: string[] = [];

  for (const match of text.matchAll(/https?:\/\/[^\s<>()[\]"']+/gi)) {
    const url = match[0].replace(/[),.;:]+$/, "");
    if (found.includes(url)) continue;

    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") found.push(url);
    } catch {
      // Not a usable URL; skip it rather than surfacing broken links.
    }
  }

  return unique(found, 20);
}

const NAME_LABELS = ["name", "full name"];

function extractName(lines: string[], labeledName: string | null): string | null {
  if (labeledName) return labeledName;

  for (const line of lines.slice(0, 6)) {
    if (line.length > 60 || /\d|@|https?:/i.test(line)) continue;
    if (matchesSection(line, ALL_SECTIONS.flatMap((key) => SECTION_NAMES[key]))) continue;

    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;
    if (words.every((word) => /^[A-Za-z][A-Za-z'.-]*$/.test(word))) return line;
  }

  return null;
}

/** Builds the canonical document from the section split. */
export function extractResumeDocument(text: string): ResumeDocument {
  const { lines, sections, order } = splitLines(text);

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
  const summary = labeled(lines, ["summary", "professional summary", "profile"])
    ?? (sections.summary?.length ? clean(sections.summary.join(" ")) : "");

  // The document service owns how loose lines become structured entries, so
  // extraction stays a single pass and the shapes cannot drift apart.
  return toResumeDocument({
    title: "Uploaded Resume",
    summary,
    skills: splitSkills(sections.skills ?? []),
    experience: sections.experience ?? [],
    education: sections.education ?? [],
    projects: sections.projects ?? [],
    certifications: sections.certifications ?? [],
    achievements: sections.achievements ?? [],
    languages: sections.languages ?? [],
    links: collectLinks(text),
    rawText: text,
    parsedProfile: {
      name: extractName(lines, labeled(lines, NAME_LABELS)),
      email,
      phone,
      location: labeled(lines, ["location", "address", "based in"]),
      currentRole: labeled(lines, ["current role", "title", "position"]),
      targetRole: labeled(lines, ["target role", "desired role"]),
      summary,
      sectionOrder: order,
    },
  });
}

function describeExperience(entry: ResumeDocument["experience"][number]): string {
  const heading = [entry.position, entry.company].filter(Boolean).join(" at ");
  const meta = [entry.startDate, entry.currentlyWorking ? "Present" : entry.endDate, entry.location]
    .filter(Boolean)
    .join(" | ");

  return [meta ? `${heading} (${meta})` : heading, ...entry.responsibilities]
    .filter(Boolean)
    .join(" - ");
}

function describeEducation(entry: ResumeDocument["education"][number]): string {
  return [entry.degree, entry.institution, entry.fieldOfStudy, entry.endDate || entry.startDate]
    .filter(Boolean)
    .join(", ");
}

function describeProject(entry: ResumeDocument["projects"][number]): string {
  return [entry.name, entry.description, ...entry.technologies, ...entry.links]
    .filter(Boolean)
    .join(" | ");
}

function describeCertification(entry: ResumeDocument["certifications"][number]): string {
  return [entry.name, entry.issuer, entry.issueDate].filter(Boolean).join(", ");
}

/**
 * Flat profile projection kept for `parsedProfile`. Existing rows and the web
 * profile page read these keys, so uploads keep populating them.
 */
export function extractStructuredProfile(text: string): ExtractedResumeProfile {
  const document = extractResumeDocument(text);

  return {
    name: document.name,
    email: document.email,
    phone: document.phone,
    location: document.location,
    skills: document.skills,
    education: document.education.map(describeEducation),
    experience: document.experience.map(describeExperience),
    projects: document.projects.map(describeProject),
    certifications: document.certifications.map(describeCertification),
    achievements: document.achievements.map((entry) => entry.title),
    languages: document.languages,
    links: document.links,
    currentRole: document.currentRole,
    targetRole: document.targetRole,
    summary: document.summary || null,
    sectionOrder: document.sectionOrder ?? [],
  };
}

export async function extractResumeText(buffer: Buffer, extension: string): Promise<string> {
  if (extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text.trim();
    } finally {
      await parser.destroy();
    }
  }

  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
