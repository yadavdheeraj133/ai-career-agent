/**
 * Normalization + validation for raw provider job records.
 *
 * Providers are inconsistent: field names, casing and enum spellings vary, and
 * any record can be malformed. `normalizeRawJob` turns one unknown record into a
 * `NormalizedJob` or a human-readable rejection reason, so the aggregation
 * pipeline can skip a bad record without aborting the whole batch.
 *
 * Field-level canonicalization lives in `job-record.ts` / `text/`. This module
 * only maps provider field names onto it and owns the parts that are specific
 * to a raw payload: required-field validation, URL canonicalization, the
 * dedup identity and the content hash.
 */
import { createHash } from "node:crypto";

import type { NormalizedJob } from "./types.js";
import { normalizeJobRecord } from "./job-record.js";

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

/**
 * Provider-supplied skills, kept as the raw value.
 *
 * Canonicalization is not done here: `normalizeJobRecord` owns it, so the
 * ingestion path and the re-normalization backfill cannot disagree. The value
 * is only narrowed from "whatever the provider sent" to "a string or an array",
 * which is what the shared normalizer accepts.
 */
function readSkills(raw: Record<string, unknown>): unknown {
  const value = raw.skills ?? raw.tags ?? raw.requiredSkills ?? raw.skillSet;
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
}

/**
 * Provider posting date, when supplied. Accepts common field spellings and
 * string/number/Date values; returns undefined for anything unparseable so a
 * bad date never rejects an otherwise valid record.
 */
function readPostedAt(raw: Record<string, unknown>): Date | undefined {
  const keys = [
    "postedAt",
    "posted_at",
    "publishedAt",
    "published_at",
    "datePosted",
  ];
  for (const key of keys) {
    const value = raw[key];
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  return undefined;
}

/**
 * Work mode and job type are canonicalized by `normalizeWorkMode` /
 * `normalizeJobType` in `text/fields.ts`, which derive from location evidence
 * and route seniority values to the experience field. The former enum maps that
 * lived here are superseded and deliberately not kept as a second, weaker
 * implementation.
 */

/**
 * First usable value across several provider field names.
 *
 * `job_types`/`tags`-style fields arrive as arrays, and the first entry is the
 * one the provider considers primary. Arrays are not joined into a
 * comma-separated string, which is what used to let a single value turn into
 * `"Full-time, Contract"`.
 */
function readFirstString(
  raw: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (typeof value === "number") return String(value);
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string" && entry.trim().length > 0) return entry.trim();
        if (typeof entry === "number") return String(entry);
      }
    }
  }
  return undefined;
}

/** Reads a boolean flag, accepting the string spellings providers use. */
function readBoolean(
  raw: Record<string, unknown>,
  keys: string[]
): boolean | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const key2 = value.toLowerCase().trim();
      if (["true", "yes", "1", "remote"].includes(key2)) return true;
      if (["false", "no", "0", "onsite", "hybrid", ""].includes(key2)) return false;
    }
  }
  return undefined;
}

/**
 * Salary as either a formatted string or a structured object.
 *
 * Structured fields are passed through untouched so the shared salary
 * normalizer can preserve min, max, currency and period exactly.
 */
function readSalary(
  raw: Record<string, unknown>
): string | number | Record<string, unknown> | undefined {
  for (const key of ["salary", "compensation", "pay", "salaryRange", "salary_range"]) {
    const value = raw[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return undefined;
}

/**
 * Recovers a provider identifier from the job URL.
 *
 * Adzuna identifies adverts by a numeric id that also appears in the landing
 * URL (`/jobs/details/5886607450`, `/jobs/land/ad/5895599733`). Reading it back
 * out restores the `provider + externalId` identity for rows ingested before
 * the field was mapped, without inventing anything: the number is the
 * provider's own.
 */
export function externalIdFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  const match = String(value).match(/\/(\d{6,})(?:\D|$)/);
  return match ? match[1]! : null;
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
    // `se`/`v` are Adzuna's per-click identifiers: the same advert reached
    // through two clicks differs only by them, so leaving them in defeats
    // deduplication entirely.
    const tracking =
      /^(utm_|ref$|ref_|source$|gh_src$|fbclid$|gclid$|se$|v$|campaign$|cid$|clickid$|trk$|trackingid$)/i;
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
  let externalId: string | null | undefined = readString(raw, [
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
      // A raw record with neither a usable URL nor an id cannot be stored
      // without inventing an identity, so it is rejected instead.
      return { ok: false, reason: "url is required" };
    }
  }

  // One central normalizer decides every display field, so an ingested record
  // and a re-normalized stored row are guaranteed to agree.
  const normalized = normalizeJobRecord({
    title,
    company,
    location: readString(raw, ["location", "city", "place"]),
    workMode: readString(raw, ["workMode", "work_mode", "workplace"]),
    remoteFlag: readBoolean(raw, ["remote", "isRemote", "is_remote"]),
    jobType: readFirstString(raw, [
      "jobType",
      "job_type",
      "employmentType",
      "type",
    ]),
    experience: readString(raw, ["experience", "experienceLevel", "jobLevel"]),
    salary: readSalary(raw),
    description: readString(raw, ["description", "details", "summary"]),
    skills: readSkills(raw),
    source: readString(raw, ["source", "platform"]),
    provider,
  });

  const postedAt = readPostedAt(raw);

  const base = {
    ...normalized,
    // `salary`/`experience`/`description` are null when absent, which is what
    // the optional columns and the UI's `?? "Not specified"` fallbacks expect.
    experience: normalized.experience ?? undefined,
    salary: normalized.salary ?? undefined,
    description: normalized.description ?? undefined,
    skills: normalized.skills,
    provider: provider || null,
    externalId: externalId ?? null,
    url,
    ...(postedAt ? { postedAt } : {}),
  } satisfies Omit<NormalizedJob, "contentHash">;

  return { ok: true, job: { ...base, contentHash: computeContentHash(base) } };
}

/** Identity key used to dedupe records inside a single batch. */
export function identityKey(job: NormalizedJob): string {
  if (job.provider && job.externalId) {
    return `${job.provider.toLowerCase()}:${job.externalId}`;
  }
  return job.url.toLowerCase();
}
