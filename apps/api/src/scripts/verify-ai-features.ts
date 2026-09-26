/**
 * ------------------------------------------------------------------
 * AI feature verification (live)
 * ------------------------------------------------------------------
 * Backend-only. Runs every AI feature service against the real configured
 * AgentRouter model using representative server-side context, and reports
 * whether the response parsed and satisfied its Zod schema.
 *
 * This is the check that a request merely being *sent* is not enough: each
 * feature must come back with real, schema-valid generated text.
 *
 *   pnpm --filter @repo/api ai:verify-features
 *   pnpm --filter @repo/api ai:verify-features -- --only resume-analysis,ats
 * ------------------------------------------------------------------
 */
import "../config/env.js";

import { resolveAgentRouterConfig } from "../ai/config/ai-config.js";
import { isAIProviderError } from "../ai/providers/ai-provider.error.js";
import { careerAIService } from "../services/resume-ai.service.js";
import { careerGuidanceAIService } from "../services/career-ai.service.js";
import { applicationAIService } from "../services/application-ai.service.js";
import { interviewAIService } from "../services/interview-ai.service.js";

const RESUME = `Jordan Alvarez
Senior Backend Engineer
jordan.alvarez@example.com | London, UK

EXPERIENCE
Acme Payments, Senior Backend Engineer (2022 - present)
- Built a TypeScript/Node.js payments service handling 12k requests per second.
- Cut p99 latency from 840ms to 190ms by introducing Redis caching and query tuning.
- Led the migration of 40 PostgreSQL tables to a partitioned schema.
- Mentored 4 junior engineers and introduced the on-call runbook.

Globex, Backend Engineer (2019 - 2022)
- Delivered a REST API in Express with JWT authentication and role-based access control.
- Wrote unit and integration tests reaching 85% coverage.

SKILLS
TypeScript, JavaScript, Node.js, Express, PostgreSQL, Redis, Docker, AWS, Jest, Git

EDUCATION
BSc Computer Science, University of Manchester`;

const JOB_DESCRIPTION = `Senior Backend Engineer
Fintech company, London (Hybrid)

About the role
We are looking for a Senior Backend Engineer to own critical payment services.

Requirements
- 5+ years of backend engineering experience
- Strong TypeScript or Node.js experience
- Production experience with PostgreSQL and Redis
- Comfortable with AWS and Docker
- Experience mentoring engineers and owning on-call

Nice to have
- Payments or financial systems experience
- Kafka or event-driven architecture`;

const COMPANY_INFORMATION = `Northwind Pay is a London-based payments company founded in 2016.
It serves 2 million retail customers across the UK and Europe.
Engineering is 40 people across four squads. The company is profitable,
bootstrapped, and migrating its core ledger to an event-driven architecture.`;

const CAREER_GOAL = "Move into a Staff Engineer role within 18 months";

const only = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

type Feature = {
  name: string;
  run: () => Promise<unknown>;
};

const FEATURES: Feature[] = [
  { name: "resume-analysis", run: () => careerAIService.analyzeResume(RESUME) },
  { name: "ats", run: () => careerAIService.analyzeATS(RESUME, JOB_DESCRIPTION) },
  { name: "skill-gap", run: () => careerAIService.analyzeSkillGap(RESUME, JOB_DESCRIPTION) },
  { name: "resume-tailor", run: () => careerAIService.tailorResume(RESUME, JOB_DESCRIPTION) },
  { name: "job-match", run: () => careerAIService.matchResumeWithJob(RESUME, JOB_DESCRIPTION) },
  { name: "ai-verdict", run: () => careerAIService.generateAIVerdict(RESUME, JOB_DESCRIPTION) },
  {
    name: "interview-probability",
    run: () => careerAIService.calculateInterviewProbability(RESUME, JOB_DESCRIPTION),
  },
  {
    name: "cover-letter",
    run: () => applicationAIService.generateCoverLetter(RESUME, JOB_DESCRIPTION),
  },
  {
    name: "application-message",
    run: () =>
      applicationAIService.generateApplicationMessage(
        RESUME,
        JOB_DESCRIPTION,
        "Northwind Pay",
        "Senior Backend Engineer",
        "Jordan Alvarez",
        "linkedin"
      ),
  },
  {
    name: "application-answer",
    run: () =>
      applicationAIService.generateApplicationAnswer(
        "Describe a time you improved system performance.",
        RESUME,
        JOB_DESCRIPTION
      ),
  },
  {
    name: "interview-preparation",
    run: () => interviewAIService.prepareInterview(RESUME, JOB_DESCRIPTION),
  },
  { name: "job-summary", run: () => interviewAIService.generateJobSummary(JOB_DESCRIPTION) },
  {
    name: "company-insights",
    run: () => interviewAIService.generateCompanyInsight(COMPANY_INFORMATION),
  },
  {
    name: "career-coach",
    run: () =>
      careerGuidanceAIService.generateCareerCoach(RESUME, "Senior Backend Engineer", CAREER_GOAL),
  },
  {
    name: "career-roadmap",
    run: () =>
      careerGuidanceAIService.generateCareerRoadmap(
        RESUME,
        "Senior Backend Engineer",
        CAREER_GOAL
      ),
  },
  {
    name: "learning-path",
    run: () => careerGuidanceAIService.generateLearningPath(RESUME, CAREER_GOAL),
  },
];

const selected = only
  ? FEATURES.filter((feature) => only.includes(feature.name))
  : FEATURES;

if (selected.length === 0) {
  process.stderr.write(`No feature matched ${JSON.stringify(only)}\n`);
  process.exit(2);
}

const config = resolveAgentRouterConfig();

process.stdout.write("AI feature verification (live AgentRouter)\n");
process.stdout.write("=======================================\n");
process.stdout.write(`  model   ${config.model}\n`);
process.stdout.write(`  route   ${config.baseUrl}/chat/completions\n\n`);

let failures = 0;

for (const feature of selected) {
  const startedAt = Date.now();

  try {
    const result = await feature.run();
    const elapsed = Date.now() - startedAt;
    const summary = summarize(result);

    process.stdout.write(
      `PASS  ${feature.name.padEnd(24)} ${String(elapsed).padStart(6)}ms  ${summary}\n`
    );
  } catch (error) {
    failures += 1;
    const elapsed = Date.now() - startedAt;
    const code = isAIProviderError(error) ? error.code : "UNEXPECTED";
    const detail =
      error instanceof Error ? error.message.split("\n")[0] : String(error);

    process.stdout.write(
      `FAIL  ${feature.name.padEnd(24)} ${String(elapsed).padStart(6)}ms  [${code}] ${detail}\n`
    );
  }
}

process.stdout.write(
  `\n${failures === 0 ? "SUCCESS" : "FAILURE"}: ${selected.length - failures}/${selected.length} feature(s) returned schema-valid output from ${config.model}.\n`
);

if (failures > 0) process.exitCode = 1;

/** A short, secret-free echo of the keys the model actually produced. */
function summarize(value: unknown): string {
  if (!value || typeof value !== "object") return "(no object)";
  const keys = Object.keys(value as Record<string, unknown>).slice(0, 6);
  return `{ ${keys.join(", ")}${keys.length === 6 ? ", …" : ""} }`;
}
