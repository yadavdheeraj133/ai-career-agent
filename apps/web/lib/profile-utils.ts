const skillAliases: Record<string, string[]> = {
  react: ["react", "react js", "react.js", "reactjs"],
  node: ["node", "node js", "node.js", "nodejs"],
  javascript: ["javascript", "js"],
  typescript: ["typescript", "ts"],
  next: ["next", "next js", "next.js", "nextjs"],
  postgresql: ["postgresql", "postgres", "psql"],
  python: ["python", "py"],
  css: ["css", "cascading style sheets"],
  html: ["html", "hypertext markup language"],
  sql: ["sql", "structured query language"],
  docker: ["docker", "docker compose"],
};

const PAGE_ARTIFACT_RE =
  /(?:^|\s)(?:--\s*(?:\d+\s+of\s+\d+|\d+)\s*--|page\s+\d+\s*(?:of\s+\d+)?|1\s+of\s+1)(?=\s|$)/gi;

export function normalizeResumeText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  let text = String(value).replace(/\u00A0/g, " ").replace(/\r/g, "\n");
  text = text.replace(/[\u2013\u2014]/g, "-");
  text = text.replace(PAGE_ARTIFACT_RE, " ");

  for (let index = 0; index < 4; index += 1) {
    const next = text.replace(/^(?:\s*(?:[•▪◦◈●·]|[-*])\s*)+/u, "").trim();
    if (next === text) {
      break;
    }
    text = next;
  }

  text = text.replace(/^(?:\s*(?:[•▪◦◈●·]|[-*])\s*)+/u, "").trim();
  text = text.replace(/\s{2,}/g, " ").trim();

  if (!text || /^(?:not found in the resume|n\/a|na|not available|none)$/i.test(text)) {
    return "";
  }

  return text;
}

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const items: string[] = [];

  for (const item of value) {
    const next = normalizeResumeText(typeof item === "string" ? item : String(item ?? ""));

    if (!next) {
      continue;
    }

    const key = next.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push(next);
  }

  return items;
}

function normalizeSkill(value: string): string {
  return value
    .trim()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\s_]+/g, " ")
    .replace(/\./g, " ")
    .toLowerCase();
}

function getSkillKey(value: string): string {
  const normalized = normalizeSkill(value);

  if (!normalized) {
    return "";
  }

  for (const [canonical, aliases] of Object.entries(skillAliases)) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }

  return normalized
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeSkills(userSkills: string[] = [], resumeSkills: string[] = []): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  const values = [...userSkills, ...resumeSkills]
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);

  for (const skill of values) {
    const key = getSkillKey(skill);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(skill);
  }

  return merged;
}
