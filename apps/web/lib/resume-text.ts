/**
 * Converts the stored `Resume` row (whose JSON columns are `unknown`) into a
 * plain-text document for the AI tools. The JSON columns follow the
 * `create-resume.validator.ts` shapes but are read defensively so a malformed
 * value never crashes the page.
 */

import type { Resume } from "./types";

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Dict;
  }

  return null;
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pushList(lines: string[], values: unknown[]): void {
  for (const value of values) {
    const text = asText(value);
    if (text) {
      lines.push(text);
    }
  }
}

function joinRange(start: unknown, end: unknown): string {
  const from = asText(start);
  const to = asText(end) || "Present";

  if (from && to) {
    return `${from} – ${to}`;
  }

  return from || to;
}

export function resumeToText(resume: Resume | null | undefined): string {
  if (!resume) {
    return "";
  }

  const lines: string[] = [];

  if (resume.title) {
    lines.push(resume.title);
  }

  if (resume.summary) {
    lines.push("", "SUMMARY", resume.summary);
  }

  const skills = asList(resume.skills)
    .map((skill) => asText(skill))
    .filter(Boolean);

  if (skills.length > 0) {
    lines.push("", "SKILLS", skills.join(", "));
  }

  const experience = asList(resume.experience);
  if (experience.length > 0) {
    lines.push("", "EXPERIENCE");

    for (const entry of experience) {
      const item = asDict(entry);
      if (!item) {
        continue;
      }

      const role = asText(item.role) || asText(item.position);
      const company = asText(item.company);
      const location = asText(item.location);
      const range = joinRange(item.startDate, item.endDate);

      const heading = [role, company].filter(Boolean).join(" at ");
      const meta = [range, location].filter(Boolean).join(" | ");

      if (heading) {
        lines.push(meta ? `${heading} (${meta})` : heading);
      }

      const description = asText(item.description);
      if (description) {
        lines.push(description);
      }
    }
  }

  const education = asList(resume.education);
  if (education.length > 0) {
    lines.push("", "EDUCATION");

    for (const entry of education) {
      const item = asDict(entry);
      if (!item) {
        continue;
      }

      const degree = asText(item.degree);
      const institution = asText(item.institution);
      const field = asText(item.fieldOfStudy);
      const grade = asText(item.grade);
      const range = joinRange(item.startDate, item.endDate);

      const heading = [degree, institution].filter(Boolean).join(", ");
      const meta = [field, range, grade].filter(Boolean).join(" | ");

      if (heading) {
        lines.push(meta ? `${heading} (${meta})` : heading);
      }
    }
  }

  const projects = asList(resume.projects);
  if (projects.length > 0) {
    lines.push("", "PROJECTS");

    for (const entry of projects) {
      const item = asDict(entry);
      if (!item) {
        continue;
      }

      const title = asText(item.title);
      const description = asText(item.description);

      if (title) {
        lines.push(description ? `${title}: ${description}` : title);
      }

      const technologies = asList(item.technologies)
        .map((technology) => asText(technology))
        .filter(Boolean);

      if (technologies.length > 0) {
        lines.push(`Technologies: ${technologies.join(", ")}`);
      }
    }
  }

  const certifications = asList(resume.certifications);
  if (certifications.length > 0) {
    lines.push("", "CERTIFICATIONS");

    for (const entry of certifications) {
      const item = asDict(entry);
      if (!item) {
        continue;
      }

      const name = asText(item.name);
      const issuer = asText(item.issuer);
      const heading = [name, issuer].filter(Boolean).join(" – ");

      if (heading) {
        lines.push(heading);
      }
    }
  }

  const achievements = asList(resume.achievements);
  if (achievements.length > 0) {
    lines.push("", "ACHIEVEMENTS");

    for (const entry of achievements) {
      const item = asDict(entry);
      if (!item) {
        continue;
      }

      const title = asText(item.title);
      const description = asText(item.description);

      if (title) {
        lines.push(description ? `${title}: ${description}` : title);
      }
    }
  }

  const languages = asList(resume.languages)
    .map((language) => asText(language))
    .filter(Boolean);

  if (languages.length > 0) {
    lines.push("", "LANGUAGES", languages.join(", "));
  }

  const links = asDict(resume.links);
  if (links) {
    const values: string[] = [];
    pushList(values, [
      links.github,
      links.linkedin,
      links.portfolio,
      links.website,
    ]);

    if (values.length > 0) {
      lines.push("", "LINKS", ...values);
    }
  }

  return lines.join("\n").trim();
}
