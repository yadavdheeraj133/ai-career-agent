import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

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
  currentRole: string | null;
  targetRole: string | null;
  summary: string | null;
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function section(lines: string[], names: string[]): string[] {
  const start = lines.findIndex((line) =>
    names.some((name) => new RegExp(`^${name}\\s*:??$`, "i").test(line))
  );
  if (start < 0) return [];

  const result: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^[A-Z][A-Z &/-]{2,}$/.test(line)) break;
    if (line) result.push(line);
  }
  return result;
}

function labeled(lines: string[], labels: string[]): string | null {
  for (const line of lines) {
    const match = line.match(new RegExp(`^(?:${labels.join("|")})\\s*[:|-]\\s*(.+)$`, "i"));
    if (match?.[1]) return clean(match[1]);
  }
  return null;
}

function splitSkills(lines: string[]): string[] {
  return lines
    .flatMap((line) => line.split(/[,;|•]/))
    .map(clean)
    .filter((skill) => skill.length > 0 && skill.length <= 80)
    .slice(0, 100);
}

export function extractStructuredProfile(text: string): ExtractedResumeProfile {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? null;
  const skills = splitSkills(section(lines, ["skills", "technical skills", "technologies"]));
  const education = section(lines, ["education", "academic background"]);
  const experience = section(lines, ["experience", "work experience", "employment"]);
  const projects = section(lines, ["projects", "personal projects"]);
  const certifications = section(lines, ["certifications", "certificates"]);
  const achievements = section(lines, ["achievements", "awards"]);

  return {
    name: labeled(lines, ["name", "full name"]) ?? (lines[0] && !lines[0].includes("@") ? lines[0] : null),
    email,
    phone,
    location: labeled(lines, ["location", "address"]),
    skills,
    education,
    experience,
    projects,
    certifications,
    achievements,
    currentRole: labeled(lines, ["current role", "title", "position"]),
    targetRole: labeled(lines, ["target role", "desired role"]),
    summary: labeled(lines, ["summary", "professional summary", "profile"]),
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