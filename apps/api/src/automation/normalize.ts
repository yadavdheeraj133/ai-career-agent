/**
 * Normalization + validation for raw provider job records.
 *
 * Providers are inconsistent: field names, casing and enum spellings vary, and
 * any record can be malformed. `normalizeRawJob` turns one unknown record into a
 * `NormalizedJob` or a human-readable rejection reason, so the aggregation
 * pipeline can skip a bad record without aborting the whole batch.
 */
import { createHash } from "node:crypto";

import type { JobType, NormalizedJob, WorkMode } from "./types.js";

const WORK_MODE_MAP: Record<string, WorkMode> = {
  remote: "Remote",
  "fully remote": "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
  "on-site": "Onsite",
  "on site": "Onsite",
  office: "Onsite",
  "in office": "Onsite",
};

const JOB_TYPE_MAP: Record<string, JobType> = {
  "full-time": "Full-time",
  fulltime: "Full-time",
  full_time: "Full-time",
  full: "Full-time",
  "part-time": "Part-time",
  parttime: "Part-time",
  part_time: "Part-time",
  part: "Part-time",
  internship: "Internship",
  intern: "Internship",
  contract: "Contract",
  contractor: "Contract",
  freelance: "Freelance",
  freelancer: "Freelance",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(
  raw: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return undefined;
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

export function normalizeWorkMode(value: string | undefined): WorkMode {
  if (!value) return "Onsite";
  return WORK_MODE_MAP[value.toLowerCase().trim()] ?? "Onsite";
}

export function normalizeJobType(value: string | undefined): JobType {
  if (!value) return "Full-time";
  return JOB_TYPE_MAP[value.toLowerCase().trim()] ?? "Full-time";
}

/**
 * Canonical URL used for dedup: lowercased, tracking query params and hash
 * removed, trailing slash trimmed. Null when the input is not a usable URL.
 */
export function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    url.hash = "";
    const tracking = /^(utm_|ref$|ref_|source$|gh_src$|fbclid$|gclid$)/i;
    for (const key of [...url.searchParams.keys()]) {
      if (tracking.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.host = url.host.toLowerCase();
    url.protocol = url.protocol.toLowerCase();
    let pathname = url.pathname.replace(/\/+$/, "");
    if (pathname === "") pathname = "/";
    url.pathname = pathname;
    return url.toString();
  } catch {
    return null;
  }
}

export function computeContentHash(
  job: Omit<NormalizedJob, "contentHash">
): string {
  const canonical = [
    job.title.toLowerCase(),
    job.company.toLowerCase(),
    job.location.toLowerCase(),
    job.workMode,
    job.jobType,
    job.experience?.toLowerCase() ?? "",
    job.salary?.toLowerCase() ?? "",
    job.description?.toLowerCase() ?? "",
  ].join("|");

  return createHash("sha256").update(canonical).digest("hex");
}

export type NormalizeResult =
  | { ok: true; job: NormalizedJob }
  | { ok: false; reason: string };

export function normalizeRawJob(
  raw: unknown,
  provider: string
): NormalizeResult {
  if (!isRecord(raw)) {
    return { ok: false, reason: "Job record must be an object" };
  }

  const title = readString(raw, ["title", "jobTitle", "position", "role"]);
  if (!title || title.length < 3) {
    return { ok: false, reason: "title is required (min 3 characters)" };
  }
  if (title.length > 100) {
    return { ok: false, reason: "title exceeds 100 characters" };
  }

  const company = readString(raw, ["company", "companyName", "employer"]);
  if (!company || company.length < 2) {
    return { ok: false, reason: "company is required (min 2 characters)" };
  }
  if (company.length > 100) {
    return { ok: false, reason: "company exceeds 100 characters" };
  }

  const rawUrl = readString(raw, ["url", "applyUrl", "link", "jobUrl"]);
  const externalId = readString(raw, [
    "externalId",
    "external_id",
    "jobId",
    "id",
  ]);

  let url = normalizeUrl(rawUrl);
  if (!url) {
    if (externalId) {
      // Deterministic placeholder keeps the url unique for id-only providers.
      url = `https://${provider.toLowerCase()}.local/jobs/${encodeURIComponent(
        externalId
      )}`;
    } else {
      return { ok: false, reason: "url is required" };
    }
  }

  const location =
    readString(raw, ["location", "city", "place"]) ?? "Not specified";

  const description = readString(raw, ["description", "details", "summary"]);
  const experience = readString(raw, ["experience", "experienceLevel"]);
  const salary = readString(raw, ["salary", "compensation", "pay"]);
  const source =
    readString(raw, ["source", "provider", "platform"]) ?? provider;

  const base = {
    title,
    company,
    location: clamp(location, 100),
    workMode: normalizeWorkMode(
      readString(raw, ["workMode", "work_mode", "remote", "workplace"])
    ),
    jobType: normalizeJobType(
      readString(raw, ["jobType", "job_type", "employmentType", "type"])
    ),
    experience: experience ? clamp(experience, 100) : undefined,
    salary: salary ? clamp(salary, 100) : undefined,
    description: description ? clamp(description, 10_000) : undefined,
    source: clamp(source, 50),
    provider: provider || null,
    externalId: externalId ?? null,
    url,
  } satisfies Omit<NormalizedJob, "contentHash">;

  return { ok: true, job: { ...base, contentHash: computeContentHash(base) } };
}

/** Identity key used to dedupe records inside a single batch. */
export function identityKey(job: NormalizedJob): string {
  return job.url.toLowerCase();
}
