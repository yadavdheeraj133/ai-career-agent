/**
 * Minimal PDF writer for resume documents.
 *
 * The project has no document-generation dependency, so this renders the
 * canonical `ResumeDocument` to a real PDF using the base-14 Helvetica fonts
 * every reader already ships. It produces a standard text document with word
 * wrapping and page breaks, not an HTML or text dump renamed to `.pdf`.
 */

import type { ResumeDocument, ResumeSectionKey } from "./resume-document.service.js";
import { orderedSectionKeys } from "./resume-document.service.js";
import {
  DEFAULT_TEMPLATE_STYLE,
  type ResumeTemplate,
  type ResumeTemplateStyle,
} from "./resume-template.service.js";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Base-14 Helvetica advance widths (1/1000 em) for WinAnsi codes 32-126.
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

const FONTS = { regular: HELVETICA, bold: HELVETICA_BOLD } as const;
type FontName = keyof typeof FONTS;

/** WinAnsi is single-byte, so anything outside it is transliterated or dropped. */
function toWinAnsi(value: string): string {
  let result = "";

  for (const char of value) {
    const code = char.codePointAt(0) ?? 63;

    if (code === 0x2018 || code === 0x2019) result += "'";
    else if (code === 0x201c || code === 0x201d) result += '"';
    else if (code >= 0x2010 && code <= 0x2015) result += "-";
    else if (code === 0x2022) result += String.fromCharCode(0x95);
    else if (code === 0x2026) result += "...";
    else if (code === 0xa0) result += " ";
    else if (code < 256) result += char;
    else result += "?";
  }

  return result;
}

function sanitize(value: string): string {
  return toWinAnsi(value).replace(/[\r\n\t]+/g, " ");
}

function charWidth(char: string, font: FontName): number {
  const code = char.charCodeAt(0);
  const table = FONTS[font];

  if (code >= 32 && code <= 126) return table[code - 32] ?? 500;
  if (code === 0x95) return 350;

  return 500;
}

function measure(value: string, font: FontName, size: number): number {
  let total = 0;

  for (const char of value) {
    total += charWidth(char, font);
  }

  return (total * size) / 1000;
}

/** Greedy word wrap; a single word longer than the column is hard-split. */
function wrap(value: string, font: FontName, size: number, width: number): string[] {
  const words = sanitize(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of words) {
    if (measure(word, font, size) > width) {
      pushCurrent();
      let chunk = "";

      for (const char of word) {
        if (measure(chunk + char, font, size) > width && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }

      current = chunk;
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;

    if (measure(candidate, font, size) > width) {
      pushCurrent();
      current = word;
    } else {
      current = candidate;
    }
  }

  pushCurrent();
  return lines;
}

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

interface Line {
  text: string;
  font: FontName;
  size: number;
  /** Extra leading space before the line, used for bullets and indentation. */
  indent?: number;
  /** Space below the line, used after headings. */
  gapAfter?: number;
  rule?: boolean;
  /** Rule drawn after the line instead of before it. */
  underline?: boolean;
  /** Text fill colour; omitted lines stay black, as they always have. */
  color?: [number, number, number];
  /** Horizontal alignment inside the text column; defaults to left. */
  align?: "left" | "center";
}

const DEFAULT_RULE_COLOR: [number, number, number] = [0.78, 0.8, 0.84];

function colorCode([red, green, blue]: [number, number, number]): string {
  return `${red} ${green} ${blue}`;
}

class PageBuilder {
  private readonly pages: string[] = [];
  private current: string[] = [];
  private y = PAGE_HEIGHT - MARGIN;

  private ensure(space: number): void {
    if (this.y - space >= MARGIN) return;
    this.flush();
  }

  private flush(): void {
    if (this.current.length) this.pages.push(this.current.join("\n"));
    this.current = [];
    this.y = PAGE_HEIGHT - MARGIN;
  }

  /** A horizontal hairline across the text column. */
  private hairline(color: [number, number, number] = DEFAULT_RULE_COLOR): string {
    return `${colorCode(color)} RG 0.7 w ${MARGIN} ${this.y.toFixed(2)} m ${(PAGE_WIDTH - MARGIN).toFixed(2)} ${this.y.toFixed(2)} l S`;
  }

  add(line: Line): void {
    const indent = line.indent ?? 0;
    const width = CONTENT_WIDTH - indent;
    const wrapped = wrap(line.text, line.font, line.size, width);
    const leading = line.size * 1.32;
    const gapAfter = line.gapAfter ?? 0;

    this.ensure(
      leading * wrapped.length +
        gapAfter +
        (line.rule ? 6 : 0) +
        (line.underline ? 7 : 0)
    );

    if (line.rule) {
      this.y -= 2;
      this.current.push(this.hairline());
      this.y -= 6;
    }

    // Colour is only ever emitted for a line that asked for it, so the default
    // document keeps producing the exact stream it always did.
    const paintOn = line.color ? `${colorCode(line.color)} rg ` : "";
    const paintOff = line.color ? " 0 0 0 rg" : "";

    for (const text of wrapped) {
      this.y -= leading;

      const lineWidth = measure(text, line.font, line.size);
      const x =
        line.align === "center"
          ? MARGIN + indent + Math.max(0, (width - lineWidth) / 2)
          : MARGIN + indent;

      this.current.push(
        `${paintOn}BT /${line.font === "bold" ? "F2" : "F1"} ${line.size} Tf 1 0 0 1 ${x.toFixed(2)} ${this.y.toFixed(2)} Tm (${escape(text)}) Tj ET${paintOff}`
      );
    }

    if (line.underline && wrapped.length > 0) {
      this.y -= 3;
      this.current.push(this.hairline(line.color ?? DEFAULT_RULE_COLOR));
      this.y -= 4;
    }

    this.y -= gapAfter;
  }

  finish(): string[] {
    this.flush();
    return this.pages.length ? this.pages : [""];
  }
}

function joinRange(start: string, end: string, currentlyWorking: boolean): string {
  const to = currentlyWorking ? "Present" : end;
  if (start && to) return `${start} - ${to}`;
  return start || to || "";
}

function sectionHeading(builder: PageBuilder, label: string, style: ResumeTemplateStyle): void {
  const color = style.headingColor ?? undefined;
  const base = { text: label.toUpperCase(), font: "bold" as const, size: 10.5, gapAfter: 3, color };

  if (style.heading === "plain") {
    builder.add(base);
    return;
  }

  if (style.heading === "underline") {
    builder.add({ ...base, underline: true });
    return;
  }

  builder.add({ ...base, rule: true });
}

/** Entry titles: one line, or the role stacked above the company. */
function entryHeading(
  builder: PageBuilder,
  primary: string,
  secondary: string,
  style: ResumeTemplateStyle
): void {
  if (!primary && !secondary) return;

  if (style.entry === "stacked" && primary && secondary && primary !== secondary) {
    builder.add({ text: primary, font: "bold", size: 10.5, gapAfter: 1 });
    builder.add({ text: secondary, font: "regular", size: 10, gapAfter: 1 });
    return;
  }

  builder.add({
    text: [primary, secondary].filter(Boolean).join(style.separator),
    font: "bold",
    size: 10.5,
    gapAfter: 1,
  });
}

/**
 * Renders a resume document to a real PDF.
 *
 * `template` only changes presentation — section order, heading treatment and
 * typographic detail. It is optional, so the tailored-resume download keeps
 * exactly the layout it has always had.
 */
export function renderResumePdf(
  document: ResumeDocument,
  fallbackTitle = "Resume",
  template?: ResumeTemplate
): Buffer {
  const style = template?.style ?? DEFAULT_TEMPLATE_STYLE;
  const align = style.nameAlign;
  const builder = new PageBuilder();
  const name = document.name || document.title || fallbackTitle;

  builder.add({ text: name, font: "bold", size: style.nameSize, gapAfter: 2, align });

  if (document.currentRole) {
    builder.add({ text: document.currentRole, font: "regular", size: 10.5, gapAfter: 2, align });
  }

  const contact = [document.email, document.phone, document.location]
    .filter(Boolean)
    .join(style.separator);
  if (contact) builder.add({ text: contact, font: "regular", size: 9.5, gapAfter: 1, align });

  if (document.links.length) {
    builder.add({
      text: document.links.join(style.separator),
      font: "regular",
      size: 9.5,
      gapAfter: 4,
      align,
    });
  }

  const order = orderedSectionKeys(template?.sectionOrder ?? document.sectionOrder);

  for (const key of order) {
    if (!SECTION_HAS_CONTENT[key](document)) continue;

    sectionHeading(builder, SECTION_LABELS[key], style);
    SECTION_RENDERERS[key](builder, document, style);
  }

  return buildPdf(builder.finish());
}

function renderSummary(builder: PageBuilder, document: ResumeDocument): void {
  builder.add({ text: document.summary, font: "regular", size: 10, gapAfter: 3 });
}

function renderSkills(builder: PageBuilder, document: ResumeDocument): void {
  builder.add({ text: document.skills.join(", "), font: "regular", size: 10, gapAfter: 3 });
}

function renderExperience(
  builder: PageBuilder,
  document: ResumeDocument,
  style: ResumeTemplateStyle
): void {
  for (const entry of document.experience) {
    entryHeading(builder, entry.position, entry.company, style);

    const meta = [joinRange(entry.startDate, entry.endDate, entry.currentlyWorking), entry.location]
      .filter(Boolean)
      .join(style.separator);

    if (meta) builder.add({ text: meta, font: "regular", size: 9.5, gapAfter: 1 });

    for (const responsibility of entry.responsibilities) {
      builder.add({
        text: `${style.bullet} ${responsibility}`,
        font: "regular",
        size: 10,
        indent: 10,
      });
    }

    builder.add({ text: "", font: "regular", size: 5 });
  }
}

function renderEducation(
  builder: PageBuilder,
  document: ResumeDocument,
  style: ResumeTemplateStyle
): void {
  for (const entry of document.education) {
    entryHeading(builder, entry.degree, entry.institution, style);

    const meta = [entry.fieldOfStudy, entry.endDate || entry.startDate, entry.grade]
      .filter(Boolean)
      .join(style.separator);

    if (meta) builder.add({ text: meta, font: "regular", size: 9.5 });
    builder.add({ text: "", font: "regular", size: 5 });
  }
}

function renderProjects(builder: PageBuilder, document: ResumeDocument): void {
  for (const entry of document.projects) {
    if (entry.name) builder.add({ text: entry.name, font: "bold", size: 10.5, gapAfter: 1 });
    if (entry.description) builder.add({ text: entry.description, font: "regular", size: 10, gapAfter: 1 });
    if (entry.technologies.length) {
      builder.add({ text: `Technologies: ${entry.technologies.join(", ")}`, font: "regular", size: 9.5, gapAfter: 1 });
    }
    for (const link of entry.links) {
      builder.add({ text: link, font: "regular", size: 9.5, indent: 10 });
    }
    builder.add({ text: "", font: "regular", size: 5 });
  }
}

function renderCertifications(builder: PageBuilder, document: ResumeDocument): void {
  for (const entry of document.certifications) {
    const heading = [entry.name, entry.issuer].filter(Boolean).join("  |  ");
    const meta = [entry.issueDate, entry.credentialId, entry.credentialUrl].filter(Boolean).join("  |  ");

    if (heading) builder.add({ text: heading, font: "bold", size: 10, gapAfter: 1 });
    if (meta) builder.add({ text: meta, font: "regular", size: 9.5 });
  }
}

function renderAchievements(builder: PageBuilder, document: ResumeDocument): void {
  for (const entry of document.achievements) {
    builder.add({ text: entry.title, font: "bold", size: 10, gapAfter: 1 });
    if (entry.description) builder.add({ text: entry.description, font: "regular", size: 10 });
  }
}

function renderLanguages(builder: PageBuilder, document: ResumeDocument): void {
  builder.add({ text: document.languages.join(", "), font: "regular", size: 10 });
}

const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications",
  achievements: "Achievements",
  languages: "Languages",
};

const SECTION_HAS_CONTENT: Record<ResumeSectionKey, (document: ResumeDocument) => boolean> = {
  summary: (document) => Boolean(document.summary),
  skills: (document) => document.skills.length > 0,
  experience: (document) => document.experience.length > 0,
  education: (document) => document.education.length > 0,
  projects: (document) => document.projects.length > 0,
  certifications: (document) => document.certifications.length > 0,
  achievements: (document) => document.achievements.length > 0,
  languages: (document) => document.languages.length > 0,
};

const SECTION_RENDERERS: Record<
  ResumeSectionKey,
  (builder: PageBuilder, document: ResumeDocument, style: ResumeTemplateStyle) => void
> = {
  summary: (builder, document) => renderSummary(builder, document),
  skills: (builder, document) => renderSkills(builder, document),
  experience: renderExperience,
  education: renderEducation,
  projects: (builder, document) => renderProjects(builder, document),
  certifications: (builder, document) => renderCertifications(builder, document),
  achievements: (builder, document) => renderAchievements(builder, document),
  languages: (builder, document) => renderLanguages(builder, document),
};

function buildPdf(pages: string[]): Buffer {
  const objects: string[] = [];
  // 1 catalog, 2 pages, 3 F1, 4 F2, then a page + content stream per page.
  const firstPageObject = 5;

  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(
    `<< /Type /Pages /Kids [${pages
      .map((_, index) => `${firstPageObject + index * 2} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`
  );
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);

  pages.forEach((content, index) => {
    const pageObject = firstPageObject + index * 2;
    const contentObject = pageObject + 1;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`
    );
    objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
