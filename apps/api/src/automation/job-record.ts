/**
 * The canonical Job shape, produced from any provider payload or stored row.
 *
 * Both paths use this one function:
 *
 *   - ingestion, via `normalizeRawJob` in `normalize.ts`
 *   - the re-normalization backfill, via `renormalize.ts`
 *
 * That is deliberate. A field normalized at ingest time and the same field
 * normalized during a backfill must land on identical values, otherwise a
 * record would drift the next time the operator re-ran the backfill.
 */
import type { JobType, WorkMode } from "./types.js";
import {
  NOT_SPECIFIED,
  isSeniorityValue,
  normalizeCompany,
  normalizeDescription,
  normalizeExperience,
  normalizeJobType,
  normalizeLocation,
  normalizeSalary,
  normalizeSource,
  normalizeTitle,
  normalizeWorkMode,
  resolveSkills,
} from "./text/index.js";

/** Upper bounds kept from the original ingestion contract. */
export const FIELD_LIMITS = {
  title: 100,
  company: 100,
  location: 100,
  experience: 100,
  salary: 100,
} as const;

export interface JobRecordInput {
  title: string;
  company?: string | null;
  location?: string | null;
  /** Explicit arrangement field, when the provider supplies one. */
  workMode?: string | null;
  /** Explicit remote boolean, when the provider supplies one. */
  remoteFlag?: boolean | null;
  jobType?: string | null;
  experience?: string | null;
  salary?: string | number | Record<string, unknown> | null;
  description?: string | null;
  skills?: unknown;
  source?: string | null;
  provider?: string | null;
}

export interface NormalizedJobRecord {
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  jobType: JobType;
  experience: string | null;
  salary: string | null;
  description: string | null;
  /** Never null: an empty array means "the provider stated no skills". */
  skills: string[];
  source: string;
}

/** Truncates with an ellipsis, never mid-escape-sequence. */
function clampField(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Produces the canonical representation of one job.
 *
 * Ordering matters: the description is cleaned before skills are resolved,
 * because skills may be recovered from cleaned description prose.
 *
 * Optional columns (`experience`, `salary`, `description`) return `null` when
 * the provider said nothing. Storing an empty string there would render as a
 * blank tile in the UI, so absence is represented as null and the UI's own
 * fallback copy is used.
 */
export function normalizeJobRecord(input: JobRecordInput): NormalizedJobRecord {
  const title = normalizeTitle(input.title);
  const company = normalizeCompany(input.company);

  // The description is cleaned first: location/work-mode detection reads it,
  // and skill recovery uses the cleaned prose rather than raw markup.
  const description = normalizeDescription(input.description);

  const location = normalizeLocation(input.location);

  const workMode = normalizeWorkMode({
    explicit: input.workMode,
    remoteFlag: input.remoteFlag,
    location: input.location,
  });

  // A seniority value arriving in the job-type slot is an experience level, not
  // an employment type (Arbeitnow mixes both in one array).
  const jobType = isSeniorityValue(input.jobType)
    ? (NOT_SPECIFIED as JobType)
    : normalizeJobType(input.jobType);

  const experience = normalizeExperience(input.experience);
  const salary = normalizeSalary(input.salary ?? null);
  const skills = resolveSkills(input.skills, description);

  return {
    title: clampField(title || NOT_SPECIFIED, FIELD_LIMITS.title),
    company: clampField(company, FIELD_LIMITS.company),
    location: clampField(location, FIELD_LIMITS.location),
    workMode,
    jobType,
    experience: experience ? clampField(experience, FIELD_LIMITS.experience) : null,
    salary: salary ? clampField(salary, FIELD_LIMITS.salary) : null,
    description,
    skills,
    source: clampField(normalizeSource(input.provider, input.source), 50),
  };
}
