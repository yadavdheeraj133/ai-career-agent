/**
 * The one canonical structured resume model.
 *
 * Everything that reads a resume (the API, the AI tools, the PDF writer and the
 * web viewer) works from this shape. `Resume.userId` is unique, so a user has
 * exactly one primary resume and this service is a read model over that single
 * row rather than a second copy of it.
 *
 * The stored JSON columns are not consistent across writers: uploads written
 * before this model stored plain `string[]` lines, the CRUD validator stores
 * objects keyed `role`/`title`, and the tailor schema returns objects keyed
 * `position`/`name`. `toResumeDocument` reads all of those shapes and projects
 * them onto the canonical one so nothing has to be migrated or duplicated.
 */

export interface ResumeContact {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  currentRole: string | null;
  targetRole: string | null;
  links: string[];
}

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

export function isResumeSectionKey(value: unknown): value is ResumeSectionKey {
  return (
    typeof value === "string" &&
    (RESUME_SECTION_KEYS as readonly string[]).includes(value)
  );
}

/**
 * The order sections should be rendered in: the recorded source order first,
 * then any section it did not mention in the default order. Callers therefore
 * never have to handle a partial or missing list.
 */
export function orderedSectionKeys(
  sectionOrder?: ResumeSectionKey[]
): ResumeSectionKey[] {
  const ordered: ResumeSectionKey[] = [];
  const seen = new Set<ResumeSectionKey>();

  for (const key of sectionOrder ?? []) {
    if (!isResumeSectionKey(key) || seen.has(key)) continue;
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

export interface ResumeDocument extends ResumeContact {
  title: string;
  filename: string | null;
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: ResumeCertification[];
  achievements: ResumeAchievement[];
  languages: string[];
  /**
   * Order the sections appeared in the source document, so an uploaded resume
   * is displayed the way the candidate wrote it instead of a fixed order.
   * Absent for resumes that never recorded one; readers fall back to
   * `RESUME_SECTION_KEYS`.
   */
  sectionOrder?: ResumeSectionKey[];
}

export const EMPTY_RESUME_DOCUMENT: ResumeDocument = {
  title: "",
  name: null,
  filename: null,
  email: null,
  phone: null,
  location: null,
  currentRole: null,
  targetRole: null,
  links: [],
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  achievements: [],
  languages: [],
};

type Dict = Record<string, unknown>;

/** A `Resume` row as Prisma returns it, including the optional upload fields. */
export interface ResumeRow {
  title?: string | null;
  filename?: string | null;
  summary?: string | null;
  experience?: unknown;
  education?: unknown;
  skills?: unknown;
  projects?: unknown;
  certifications?: unknown;
  achievements?: unknown;
  languages?: unknown;
  links?: unknown;
  parsedProfile?: unknown;
  rawText?: string | null;
}

function asDict(value: unknown): Dict | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Dict)
    : null;
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  if (typeof value === "string") return collapse(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Dedupes case-insensitively while preserving the author's original casing. */
function uniqueStrings(value: unknown, limit = 100): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of asList(value)) {
    const item = text(entry);
    const key = item.toLowerCase();

    if (item && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }

    if (result.length >= limit) break;
  }

  return result;
}

/** URLs are user content, so they are only ever emitted when they parse as http(s). */
function safeUrl(value: unknown): string {
  const candidate = text(value);
  if (!candidate) return "";

  const match = candidate.match(/https?:\/\/[^\s<>()[\]"']+/i);
  const url = match ? match[0].replace(/[),.;:]+$/, "") : "";

  if (!url) return "";

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

const LINK_KEYS = ["github", "linkedin", "portfolio", "website"] as const;

function collectLinks(value: unknown, extra: string[] = []): string[] {
  const found: string[] = [];
  const dict = asDict(value);

  if (dict) {
    for (const key of LINK_KEYS) {
      const url = safeUrl(dict[key]);
      if (url) found.push(url);
    }

    for (const entry of Object.values(dict)) {
      const url = safeUrl(entry);
      if (url) found.push(url);
    }
  }

  for (const entry of asList(value)) {
    if (typeof entry === "string") {
      for (const match of entry.matchAll(/https?:\/\/[^\s<>()[\]"']+/gi)) {
        found.push(match[0].replace(/[),.;:]+$/, ""));
      }
    } else {
      const url = safeUrl(asDict(entry)?.url ?? asDict(entry)?.link);
      if (url) found.push(url);
    }
  }

  if (typeof value === "string") {
    for (const match of value.matchAll(/https?:\/\/[^\s<>()[\]"']+/gi)) {
      found.push(match[0].replace(/[),.;:]+$/, ""));
    }
  }

  for (const entry of extra) {
    const url = safeUrl(entry);
    if (url) found.push(url);
  }

  return uniqueStrings(found, 20);
}

const PRESENT_VALUES = new Set(["present", "current", "now", "ongoing", "today", "-"]);

function isOngoing(value: string): boolean {
  return PRESENT_VALUES.has(value.trim().toLowerCase());
}

function splitResponsibilities(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueStrings(value, 40);
  const line = text(value);
  return line ? [line] : [];
}

/** Splits one pasted entry such as "Acme | Engineer | 2020 - Present" into fields. */
function splitLooseEntry(entry: string, separators: RegExp): string[] {
  return entry
    .split(separators)
    .map((part) => part.trim())
    .filter(Boolean);
}

const YEAR = "(?:19|20)\\d{2}";
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";

/** Pulls a trailing or leading date range out of a free-text line. */
function extractDateRange(entry: string): { range: string; rest: string } {
  const rangePattern = new RegExp(
    `\\b(${MONTH}\\s+${YEAR}|${YEAR})\\s*(?:-|–|—|to|until)\\s*(${MONTH}\\s+${YEAR}|present|current|now|${YEAR})\\b`,
    "i"
  );
  const trailingYear = new RegExp(`\\b(${MONTH}\\s+${YEAR}|${YEAR})\\b\\s*$`, "i");

  const range = entry.match(rangePattern);
  if (range) {
    return {
      range: `${range[1]} - ${range[2]}`,
      rest: entry.replace(range[0], " "),
    };
  }

  const single = entry.match(trailingYear);
  if (single) {
    return { range: single[1] ?? "", rest: entry.replace(single[0], " ") };
  }

  return { range: "", rest: entry };
}

const BULLET = /^\s*[•‣▪◦*\-–—]+\s*/;

function hasBullet(value: string): boolean {
  return BULLET.test(value);
}

function stripBullet(value: string): string {
  return collapse(value.replace(BULLET, ""));
}

/** A bare URL line belongs to the entry above it rather than starting a new one. */
function isBareUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

/**
 * Groups loose section lines into entries.
 *
 * A line starts a new entry when it carries a date range, reads as a
 * `Role | Company` header, or is the first line. Everything else is detail
 * belonging to the entry above — typically an achievement bullet under a job.
 * Without this, every bullet becomes its own bogus work history entry.
 */
function groupLines(lines: string[]): Array<{ header: string; details: string[] }> {
  const groups: Array<{ header: string; details: string[] }> = [];

  for (const raw of lines) {
    const line = text(raw);
    if (!line) continue;

    const bulleted = hasBullet(line);
    const body = stripBullet(line);
    if (!body) continue;

    const hasDate = extractDateRange(body).range !== "";
    const looksLikeHeader = splitLooseEntry(body, /\s*[|｜]\s*/).length >= 2;

    if (groups.length === 0) {
      groups.push({ header: body, details: [] });
    } else if (!bulleted && (hasDate || looksLikeHeader)) {
      groups.push({ header: body, details: [] });
    } else {
      groups[groups.length - 1]!.details.push(body);
    }
  }

  return groups;
}

/**
 * Splits a stored section into runs of already-structured objects and runs of
 * loose text lines, preserving the order they appeared in the resume.
 */
function sectionRuns(value: unknown): Array<{ objects: Dict[]; lines: string[] }> {
  const runs: Array<{ objects: Dict[]; lines: string[] }> = [];
  let run = runs[runs.length - 1];

  for (const entry of asList(value)) {
    const item = asDict(entry);

    if (item) {
      if (!run || run.lines.length) {
        run = { objects: [], lines: [] };
        runs.push(run);
      }
      run.objects.push(item);
      continue;
    }

    const line = text(entry);
    if (!line) continue;

    if (!run) {
      run = { objects: [], lines: [] };
      runs.push(run);
    }
    run.lines.push(line);
  }

  return runs;
}

function toExperience(value: unknown): ResumeExperience[] {
  return sectionRuns(value).flatMap((run) => [
    ...run.objects.map(experienceFromObject),
    ...groupLines(run.lines).map((group) => toExperienceEntry(group.header, group.details)),
  ]);
}

function experienceFromObject(item: Dict): ResumeExperience {
  const endDate = text(item.endDate);

  return {
    company: text(item.company),
    position: text(item.position) || text(item.role) || text(item.title),
    location: text(item.location),
    startDate: text(item.startDate),
    endDate,
    currentlyWorking: item.currentlyWorking === true || (Boolean(endDate) && isOngoing(endDate)),
    responsibilities: splitResponsibilities(
      item.responsibilities ?? item.description ?? item.highlights
    ),
  };
}

const RESPONSIBILITY_VERBS =
  /^(?:managed|led|built|developed|designed|created|owned|drove|improved|reduced|increased|delivered|launched|maintained|introduced|established|negotiated|analyz|architected|mentored|coordinated|rewrote|migrated|automated|spearheaded|headed|directed|initiated|produced|published|researched|secured|streamlined|supported|trained|transformed|upgraded|wrote)\b/i;

/** Builds one experience entry from its header line and the lines beneath it. */
function toExperienceEntry(header: string, details: string[]): ResumeExperience {
  const { range, rest } = extractDateRange(header);
  const [first, second] = splitLooseEntry(rest, /\s*[|–—•·]\s*|\s{2,}/);
  const isDateRange = /\s-\s/.test(range);

  // "Acme Corp - Software Engineer" reads most naturally as company first, but
  // a leading verb phrase is a responsibility rather than a company name.
  const looksLikeResponsibility = RESPONSIBILITY_VERBS.test(first ?? "");

  const company = looksLikeResponsibility ? "" : first ?? "";
  const position = looksLikeResponsibility ? first ?? "" : second ?? first ?? "";
  const [startDate, endDate] = isDateRange ? range.split(/\s+-\s+/) : [range, ""];

  return {
    company,
    position,
    location: "",
    startDate: startDate?.trim() ?? "",
    endDate: endDate?.trim() ?? "",
    currentlyWorking: isOngoing(endDate ?? ""),
    // A verb-phrase header is itself the achievement; otherwise the details are.
    responsibilities: uniqueStrings(
      looksLikeResponsibility ? [header, ...details] : details,
      40
    ),
  };
}

const DEGREE_PATTERN =
  /\b(?:b\.?s\.?c?\.?|b\.?a\.?|b\.?tech|b\.?eng|b\.?sc|b\.?com|ba\b|m\.?s\.?c?\.?|m\.?a\.?|m\.?b\.?a\.?|m\.?tech|m\.?sc|master|ph\.?d|doctor|diploma|bachelor|associate)\b/i;

function looksLikeDegree(value: string): boolean {
  return DEGREE_PATTERN.test(value);
}

function toEducation(value: unknown): ResumeEducation[] {
  return asList(value)
    .map((entry) => {
      const item = asDict(entry);

      if (item) {
        return {
          institution: text(item.institution) || text(item.school) || text(item.university),
          degree: text(item.degree),
          fieldOfStudy: text(item.fieldOfStudy),
          startDate: text(item.startDate),
          endDate: text(item.endDate) || text(item.graduationDate),
          grade: text(item.grade) || text(item.gpa),
        };
      }

      const line = text(entry);
      if (!line) return null;

      const { range, rest } = extractDateRange(line);
      const [startDate, endDate] = range.includes(" - ") ? range.split(/\s+-\s+/) : ["", range];
      const [first, second] = splitLooseEntry(rest, /[,|–—]|\s{2,}/);

      // Resumes write education either way round ("BS, State U" or
      // "State U, BS"), so the degree keyword decides the order.
      const degreeFirst = looksLikeDegree(first ?? "") || !looksLikeDegree(second ?? "");

      return {
        institution: (degreeFirst ? second : first) ?? "",
        degree: (degreeFirst ? first : second) ?? "",
        fieldOfStudy: "",
        startDate: startDate?.trim() ?? "",
        endDate: endDate?.trim() ?? "",
        grade: "",
      };
    })
    .filter((entry): entry is ResumeEducation => Boolean(entry && (entry.degree || entry.institution)));
}

function toProjects(value: unknown): ResumeProject[] {
  return sectionRuns(value).flatMap((run) => [
    ...run.objects.map(projectFromObject),
    ...groupProjects(run.lines).map(projectFromLines),
  ]);
}

function projectFromObject(item: Dict): ResumeProject {
  return {
    name: text(item.name) || text(item.title),
    description: text(item.description),
    technologies: uniqueStrings(item.technologies ?? item.stack, 20),
    links: collectLinks(item),
  };
}

function projectFromLines(group: { header: string; details: string[] }): ResumeProject {
  // A project line often carries its description and URL together, and a URL on
  // the following line still belongs to this project.
  const { rest } = extractDateRange(group.header);
  const links = collectLinks([rest, ...group.details.filter(isBareUrl)]);
  const withoutLinks = [rest, ...group.details]
    .filter((part) => !isBareUrl(part))
    .join(" ")
    .replace(/https?:\/\/\S+/gi, " ");
  const [name, ...tail] = splitLooseEntry(withoutLinks, /\s*[|｜-]\s*|\s*[–—]\s*|\s{2,}|:\s/);

  return {
    name: name || "Project",
    description: tail.join(" ").trim(),
    technologies: [],
    links,
  };
}

/** Project lines rarely carry dates, so grouping keys off bullets and URLs. */
function groupProjects(lines: string[]): Array<{ header: string; details: string[] }> {
  const groups: Array<{ header: string; details: string[] }> = [];

  for (const raw of lines) {
    const bulleted = hasBullet(raw);
    const body = stripBullet(raw);
    if (!body) continue;

    if (groups.length === 0 || (!bulleted && !isBareUrl(body))) {
      groups.push({ header: body, details: [] });
    } else {
      groups[groups.length - 1]!.details.push(body);
    }
  }

  return groups;
}

function toCertifications(value: unknown): ResumeCertification[] {
  return asList(value)
    .map((entry) => {
      const item = asDict(entry);

      if (item) {
        return {
          name: text(item.name) || text(item.title),
          issuer: text(item.issuer),
          issueDate: text(item.issueDate) || text(item.date),
          credentialId: text(item.credentialId),
          credentialUrl: safeUrl(item.credentialUrl),
        };
      }

      const line = text(entry);
      if (!line) return null;
      const [name, ...tail] = splitLooseEntry(line, /\s*[|–—-]\s*|\s*,\s*/);
      return {
        name: name || line,
        issuer: tail.join(" - "),
        issueDate: "",
        credentialId: "",
        credentialUrl: collectLinks(line)[0] ?? "",
      };
    })
    .filter((entry): entry is ResumeCertification => Boolean(entry && entry.name));
}

function toAchievements(value: unknown): ResumeAchievement[] {
  return asList(value)
    .map((entry) => {
      const item = asDict(entry);

      if (item) {
        return {
          title: text(item.title) || text(item.name),
          description: text(item.description),
        };
      }

      const line = text(entry);
      return line ? { title: line, description: "" } : null;
    })
    .filter((entry): entry is ResumeAchievement => Boolean(entry));
}

function parsedProfileValue(profile: Dict | null, key: string): unknown {
  if (!profile) return undefined;
  return profile[key];
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const item = text(value);
    if (item) return item;
  }
  return "";
}

const SECTION_HEADINGS = new Set([
  "summary", "profile", "objective", "about", "experience", "work experience",
  "employment", "education", "skills", "technical skills", "projects",
  "certifications", "certificates", "achievements", "awards", "languages",
  "links", "contact", "references",
]);

/**
 * Best-effort name for rows uploaded before `parsedProfile` captured one. A
 * candidate must look like a name: short, no digits, no contact detail, and not
 * a section heading. Returning nothing is preferred over returning a heading.
 */
function inferName(rawText: string, fallback: string): string | null {
  for (const line of rawText.split(/\r?\n/).map(collapse)) {
    if (!line || line.length > 60 || /\d|@|https?:/i.test(line)) continue;
    if (SECTION_HEADINGS.has(line.toLowerCase().replace(/[:|-]+$/, "").trim())) continue;

    const words = line.split(/\s+/);
    const plausible = words.length >= 2 && words.length <= 5 && words.every((word) => /^[A-Za-z][A-Za-z'.-]*$/.test(word));

    if (plausible) return line;
  }

  return fallback || null;
}

/**
 * The section order recorded at upload time, if the profile carries one.
 * Rows written before order was captured simply have no key.
 */
function readSectionOrder(
  profile: Dict | null
): { sectionOrder?: ResumeSectionKey[] } {
  const raw = parsedProfileValue(profile, "sectionOrder");
  if (!Array.isArray(raw)) return {};

  const order = raw.filter(isResumeSectionKey);
  return order.length > 0 ? { sectionOrder: order } : {};
}

/**
 * Projects any stored resume row onto the canonical document shape.
 * Explicit structured columns win; the flat `parsedProfile` and `rawText`
 * headers only fill in contact details the structured sections do not carry.
 */
export function toResumeDocument(row: ResumeRow | null | undefined): ResumeDocument {
  if (!row) return { ...EMPTY_RESUME_DOCUMENT };

  const profile = asDict(row.parsedProfile);
  const rawText = typeof row.rawText === "string" ? row.rawText : "";

  const emailFromRaw = rawText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? "";
  const phoneFromRaw = rawText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0] ?? "";
  const linksFromRaw = collectLinks(rawText);
  const languagesFromRaw = asList(parsedProfileValue(profile, "languages"));

  const experience = toExperience(row.experience);
  const education = toEducation(row.education);
  const projects = toProjects(row.projects);
  const certifications = toCertifications(row.certifications);
  const achievements = toAchievements(row.achievements);

  const skills = uniqueStrings(
    row.skills ?? parsedProfileValue(profile, "skills")
  );

return {
      title: firstNonEmpty(row.title) || "Resume",
      name: firstNonEmpty(parsedProfileValue(profile, "name")) || inferName(rawText, ""),
      filename: row.filename ?? null,
      email: firstNonEmpty(parsedProfileValue(profile, "email"), emailFromRaw) || null,
      phone: firstNonEmpty(parsedProfileValue(profile, "phone"), phoneFromRaw) || null,
      location: firstNonEmpty(parsedProfileValue(profile, "location")) || null,
      currentRole: firstNonEmpty(parsedProfileValue(profile, "currentRole")) || null,
      targetRole: firstNonEmpty(parsedProfileValue(profile, "targetRole")) || null,
      links: collectLinks(row.links, linksFromRaw),
      summary: firstNonEmpty(row.summary, parsedProfileValue(profile, "summary")),
      skills,
      experience,
      education,
      projects,
      certifications,
      achievements,
      languages: uniqueStrings(row.languages ?? languagesFromRaw, 20),
      ...readSectionOrder(profile),
    };
}

function dateRange(start: string, end: string, currentlyWorking: boolean): string {
  const to = currentlyWorking ? "Present" : end;
  if (start && to) return `${start} - ${to}`;
  return start || to || "";
}

/**
 * Renders the canonical document back to plain text. AI prompts consume this,
 * so it is the same content the viewer shows rather than a second interpretation.
 */
export function toResumeText(document: ResumeDocument): string {
  const lines: string[] = [];

  const heading = [document.name ?? document.title, document.currentRole]
    .filter(Boolean)
    .join(" - ");
  const contact = [document.email, document.phone, document.location]
    .filter(Boolean)
    .join(" | ");

  if (heading) lines.push(heading);
  if (contact) lines.push(contact);
  if (document.links.length) lines.push(document.links.join(" | "));
  if (document.targetRole) lines.push(`Target Role: ${document.targetRole}`);

  if (document.summary) lines.push("", "SUMMARY", document.summary);

  if (document.skills.length) {
    lines.push("", "SKILLS", document.skills.join(", "));
  }

  if (document.experience.length) {
    lines.push("", "EXPERIENCE");

    for (const entry of document.experience) {
      const title = [entry.position, entry.company].filter(Boolean).join(" at ");
      const meta = [dateRange(entry.startDate, entry.endDate, entry.currentlyWorking), entry.location]
        .filter(Boolean)
        .join(" | ");

      if (title) lines.push(meta ? `${title} (${meta})` : title);
      for (const responsibility of entry.responsibilities) {
        lines.push(responsibility.startsWith("-") ? responsibility : `- ${responsibility}`);
      }
    }
  }

  if (document.education.length) {
    lines.push("", "EDUCATION");

    for (const entry of document.education) {
      const title = [entry.degree, entry.institution].filter(Boolean).join(", ");
      const meta = [entry.fieldOfStudy, dateRange(entry.startDate, entry.endDate, false), entry.grade]
        .filter(Boolean)
        .join(" | ");

      if (title) lines.push(meta ? `${title} (${meta})` : title);
    }
  }

  if (document.projects.length) {
    lines.push("", "PROJECTS");

    for (const entry of document.projects) {
      const title = [entry.name, entry.description].filter(Boolean).join(": ");
      if (title) lines.push(title);
      if (entry.technologies.length) lines.push(`Technologies: ${entry.technologies.join(", ")}`);
      for (const link of entry.links) lines.push(link);
    }
  }

  if (document.certifications.length) {
    lines.push("", "CERTIFICATIONS");

    for (const entry of document.certifications) {
      const title = [entry.name, entry.issuer].filter(Boolean).join(" - ");
      const meta = [entry.issueDate, entry.credentialUrl].filter(Boolean).join(" | ");
      lines.push(meta ? `${title} (${meta})` : title);
    }
  }

  if (document.achievements.length) {
    lines.push("", "ACHIEVEMENTS");

    for (const entry of document.achievements) {
      lines.push(entry.description ? `${entry.title}: ${entry.description}` : entry.title);
    }
  }

  if (document.languages.length) {
    lines.push("", "LANGUAGES", document.languages.join(", "));
  }

  return lines.join("\n").trim();
}

/** Non-empty section count, used to decide whether a resume can be tailored. */
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
