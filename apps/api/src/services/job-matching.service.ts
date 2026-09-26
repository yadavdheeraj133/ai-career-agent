import { prisma } from "../lib/prisma.js";
import { jobRepository } from "../repositories/jobs.repository.js";

export const STRONG_MATCH_THRESHOLD = 70;

/**
 * Canonical aliases for common skill spellings. Every alias resolves to a
 * single canonical token so that "React.js", "react" and "react js" all match
 * the same skill. The canonical tokens are also the accepted lexicon for
 * atomic skill words: a bare word is only accepted as a candidate skill when
 * it resolves to one of these, so resume prose never pollutes the profile.
 */
const SKILL_ALIASES: Record<string, string> = {
  react: "react",
  "react js": "react",
  "react.js": "react",
  reactjs: "react",
  vue: "vue",
  "vue js": "vue",
  "vue.js": "vue",
  vuejs: "vue",
  angular: "angular",
  "angular js": "angular",
  angularjs: "angular",
  "angular.js": "angular",
  svelte: "svelte",
  "next js": "nextjs",
  "next.js": "nextjs",
  nextjs: "nextjs",
  node: "nodejs",
  nodejs: "nodejs",
  "node js": "nodejs",
  "node.js": "nodejs",
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  postgres: "postgresql",
  postgresql: "postgresql",
  "postgres sql": "postgresql",
  tailwind: "tailwind",
  "tailwind css": "tailwind",
  tailwindcss: "tailwind",
  bootstrap: "bootstrap",
  sass: "sass",
  scss: "scss",
  express: "express",
  "express js": "express",
  expressjs: "express",
  flask: "flask",
  django: "django",
  python: "python",
  java: "java",
  kotlin: "kotlin",
  swift: "swift",
  ruby: "ruby",
  php: "php",
  rust: "rust",
  "c plus plus": "cpp",
  cpp: "cpp",
  "c#": "csharp",
  csharp: "csharp",
  golang: "golang",
  sql: "sql",
  mysql: "mysql",
  mongodb: "mongodb",
  mongo: "mongodb",
  redis: "redis",
  "sql server": "sql",
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  aws: "aws",
  azure: "azure",
  "google cloud": "gcp",
  gcp: "gcp",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  html: "html",
  html5: "html",
  css: "css",
  css3: "css",
  graphql: "graphql",
  rest: "rest",
  "rest api": "rest",
  "restful api": "rest",
  websocket: "websocket",
  websockets: "websocket",
  jest: "jest",
  cypress: "cypress",
  selenium: "selenium",
  linux: "linux",
  unix: "unix",
  bash: "bash",
  powershell: "powershell",
  excel: "excel",
  "microsoft excel": "excel",
  figma: "figma",
  photoshop: "photoshop",
  wordpress: "wordpress",
  shopify: "shopify",
  vite: "vite",
  gsap: "gsap",
  webpack: "webpack",
  redux: "redux",
  "redux toolkit": "redux",
  debugging: "debugging",
  deployment: "deployment",
  vercel: "vercel",
  "responsive design": "responsive design",
};

/** Resume labels that prefix the actual skill list, e.g. "Programming Languages: HTML". */
const RESUME_SECTION_PREFIXES = [
  "programming languages",
  "languages",
  "frameworks",
  "libraries",
  "frameworks and libraries",
  "frameworks / libraries",
  "tools",
  "core skills",
  "technologies",
  "tech stack",
  "stack",
  "skills",
  "soft skills",
];

/** Accepts a candidate skill word only when it resolves to a known skill. */
const SKILL_TOKEN_LEXICON = new Set(Object.values(SKILL_ALIASES));

export interface JobMatchingInput {
  skills: string[];
  preferredLocation?: string;
  preferredWorkMode?: "Remote" | "Hybrid" | "Onsite";
  preferredJobType?:
    | "Full-time"
    | "Part-time"
    | "Internship"
    | "Contract"
    | "Freelance";
}

export interface JobMatchResult {
  job: Awaited<ReturnType<typeof jobRepository.findAll>>[number];
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

function normalizeSkillLabel(value: string): string {
  if (!value) return "";

  const normalized = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_/.-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

/** Canonical skill token for a normalized phrase: alias when known, else identity. */
function canonicalSkill(normalized: string): string {
  if (!normalized) return "";
  return SKILL_ALIASES[normalized] ?? normalized;
}

/**
 * Extracts atomic, canonical skill tokens from a raw profile skill label.
 *
 * Handles the labels that resume parsers emit ("Programming Languages: HTML",
 * "FrameWorks / Libraries: React.js", "Tailwind CSS") by stripping section
 * prefixes and decomposing into known skills. Unknown prose — project titles,
 * sentences, "1 of 1" artifacts — is dropped instead of becoming a candidate
 * skill, which is what inflated profiles into barely-scoring entries.
 */
function extractSkillTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];

  let label = value.trim();
  if (!label) return [];

  const separatorIndex = label.search(/[:|]/);
  if (separatorIndex > 0) {
    const header = label.slice(0, separatorIndex).toLowerCase().trim();
    if (
      RESUME_SECTION_PREFIXES.some(
        (prefix) => header === prefix || header.includes(prefix)
      )
    ) {
      label = label.slice(separatorIndex + 1).trim();
    }
  }

  if (!label) return [];

  const seen = new Set<string>();
  const addCandidate = (part: string, isPhrase: boolean): void => {
    const normalized = normalizeSkillLabel(part);
    if (!normalized || normalized.length <= 1) return;

    const canonical = canonicalSkill(normalized);

    // Phrases contribute only when the whole phrase is a recognised alias
    // ("react.js" → react); bare words must be known skills so resume prose
    // ("clean maintainable code") is never treated as a skill.
    if (isPhrase) {
      if (SKILL_ALIASES[normalized]) seen.add(canonical);
      return;
    }

    if (SKILL_TOKEN_LEXICON.has(canonical)) {
      seen.add(canonical);
    }
  };

  addCandidate(label, true);

  for (const part of label.split(/[,;/&|]+/)) {
    for (const word of part.split(/\s+/)) {
      if (word) addCandidate(word, false);
    }
  }

  return Array.from(seen);
}

/** Adds every normalized form (identity + alias) of a token to the set. */
function addTokenVariants(set: Set<string>, value: unknown): void {
  if (typeof value !== "string") return;

  for (const part of value.split(/[,;/&|]+/)) {
    for (const word of part.split(/\s+/)) {
      if (!word) continue;
      const normalized = normalizeSkillLabel(word);
      if (!normalized) continue;
      set.add(normalized);
      const canonical = canonicalSkill(normalized);
      if (canonical !== normalized) set.add(canonical);
    }
  }
}

/**
 * Builds the keyword set for a job: title + description + experience text,
 * plus the provider-supplied `skills` array (the pipeline stores these, but
 * they were never consulted — a real matching signal that was being dropped).
 * Both raw and canonical forms are added so user canonical skills align with
 * job text ("React.js" → react, "Node" → nodejs).
 */
function collectJobKeywords(job: {
  title: string;
  description?: string | null;
  experience?: string | null;
  skills?: unknown;
}): string[] {
  const set = new Set<string>();

  addTokenVariants(set, job.title);
  addTokenVariants(set, job.description);
  addTokenVariants(set, job.experience);
  if (Array.isArray(job.skills)) {
    for (const skill of job.skills) {
      addTokenVariants(set, skill);
      if (typeof skill === "string") {
        for (const token of extractSkillTokens(skill)) set.add(token);
      }
    }
  }

  return Array.from(set);
}

interface MatchingProfile {
  skills: string[];
  preferredLocation?: string;
  preferredWorkMode?: "Remote" | "Hybrid" | "Onsite";
  preferredJobType?:
    | "Full-time"
    | "Part-time"
    | "Internship"
    | "Contract"
    | "Freelance";
}

function buildUserProfile(userId: string): Promise<MatchingProfile> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      skills: { select: { name: true } },
      preferences: {
        select: {
          location: true,
          workMode: true,
          jobType: true,
          jobRole: true,
        },
      },
      resume: {
        select: {
          skills: true,
          parsedProfile: true,
        },
      },
    },
  }).then((user) => {
    if (!user) {
      return {
        skills: [],
        preferredLocation: undefined,
        preferredWorkMode: undefined,
        preferredJobType: undefined,
      };
    }

    const skillList = new Set<string>();

    // 1. The user's own skill records (Skill table) — the strongest signal.
    for (const skill of user.skills) {
      for (const token of extractSkillTokens(skill.name)) {
        skillList.add(token);
      }
    }

    // 2. Resume skill lists / the parsed profile's skills. Only recognised
    // skills survive tokenization, so resume prose never floods the profile.
    const resume = user.resume;
    for (const entry of Array.isArray(resume?.skills) ? resume.skills : []) {
      for (const token of extractSkillTokens(entry)) {
        skillList.add(token);
      }
    }

    const parsedProfile = resume?.parsedProfile as
      | Record<string, unknown>
      | null
      | undefined;
    for (const entry of Array.isArray(parsedProfile?.skills)
      ? parsedProfile.skills
      : []) {
      for (const token of extractSkillTokens(entry)) {
        skillList.add(token);
      }
    }

    return {
      skills: Array.from(skillList),
      preferredLocation: user.preferences?.location ?? undefined,
      preferredWorkMode: user.preferences?.workMode as "Remote" | "Hybrid" | "Onsite" | undefined,
      preferredJobType: user.preferences?.jobType as
        | "Full-time"
        | "Part-time"
        | "Internship"
        | "Contract"
        | "Freelance"
        | undefined,
    };
  });
}

export class JobMatchingService {
  async matchJobs(input: JobMatchingInput | string): Promise<JobMatchResult[]> {
    if (typeof input === "string") {
      const profile = await buildUserProfile(input);
      const jobs = await jobRepository.findAll({ developerOnly: true });
      const candidateSkills = profile.skills
        .map((skill) => normalizeSkillLabel(skill))
        .filter(Boolean);

      if (candidateSkills.length === 0) {
        return jobs.map((job) => ({
          job,
          matchScore: 0,
          matchedSkills: [],
          missingSkills: [],
        }));
      }

      const results: JobMatchResult[] = [];

      for (const job of jobs) {
        const jobKeywords = collectJobKeywords(job);
        const jobSkillSet = new Set(jobKeywords);

        const matchedSkills = candidateSkills.filter((skill) => jobSkillSet.has(skill));
        const missingSkills = candidateSkills.filter((skill) => !jobSkillSet.has(skill));

        const skillRatio =
          candidateSkills.length > 0 ? matchedSkills.length / candidateSkills.length : 0;
        const locationScore =
          !profile.preferredLocation ||
          !job.location ||
          job.location.toLowerCase().includes(profile.preferredLocation.toLowerCase()) ||
          (profile.preferredLocation.toLowerCase() === "remote" &&
            job.location.toLowerCase() === "remote")
            ? 12
            : 0;

        const workModeScore =
          !profile.preferredWorkMode || job.workMode === profile.preferredWorkMode
            ? 10
            : 0;

        const jobTypeScore =
          !profile.preferredJobType || job.jobType === profile.preferredJobType
            ? 8
            : 0;

        const preferencesAligned =
          (!profile.preferredLocation ||
            !job.location ||
            job.location.toLowerCase().includes(profile.preferredLocation.toLowerCase()) ||
            (profile.preferredLocation.toLowerCase() === "remote" &&
              job.location.toLowerCase() === "remote")) &&
          (!profile.preferredWorkMode || job.workMode === profile.preferredWorkMode) &&
          (!profile.preferredJobType || job.jobType === profile.preferredJobType);

        const matchScore =
          matchedSkills.length === candidateSkills.length && preferencesAligned
            ? 100
            : Math.min(
                100,
                Math.round(skillRatio * 60 + locationScore + workModeScore + jobTypeScore)
              );

        results.push({
          job,
          matchScore,
          matchedSkills,
          missingSkills,
        });
      }

      return results
        .filter((result) => result.matchedSkills.length > 0 || result.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);
    }

    const jobs = await jobRepository.findAll({ developerOnly: true });
    const candidateSkills = input.skills
      .map((skill) => skill.toLowerCase().trim())
      .filter(Boolean);
    if (candidateSkills.length === 0) {
      return jobs.map((job) => ({
        job,
        matchScore: 0,
        matchedSkills: [],
        missingSkills: [],
      }));
    }

    const results: JobMatchResult[] = [];

    for (const job of jobs) {
      const jobText = `
        ${job.title}
        ${job.description ?? ""}
        ${job.experience ?? ""}
        ${Array.isArray(job.skills) ? job.skills.join(" ") : ""}
      `.toLowerCase();

      const matchedSkills = candidateSkills.filter(
        (skill) => skill.length > 0 && jobText.includes(skill)
      );

      const missingSkills = candidateSkills.filter(
        (skill) => skill.length > 0 && !jobText.includes(skill)
      );

      const skillScore =
        candidateSkills.length > 0
          ? (matchedSkills.length / candidateSkills.length) * 70
          : 0;

      const locationScore =
        !input.preferredLocation ||
        job.location.toLowerCase().includes(input.preferredLocation.toLowerCase())
          ? 10
          : 0;

      const workModeScore =
        !input.preferredWorkMode || job.workMode === input.preferredWorkMode
          ? 10
          : 0;

      const jobTypeScore =
        !input.preferredJobType || job.jobType === input.preferredJobType
          ? 10
          : 0;

      const matchScore = Math.round(
        Math.min(100, skillScore + locationScore + workModeScore + jobTypeScore)
      );

      results.push({
        job,
        matchScore,
        matchedSkills,
        missingSkills,
      });
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const jobMatchingService = new JobMatchingService();