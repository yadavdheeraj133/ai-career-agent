/**
 * Re-normalization of already-stored job rows.
 *
 * New records are normalized at ingest time by `normalizeRawJob`. Rows that
 * predate that work still hold raw provider HTML, uncanonical skills and
 * inconsistent locations, so this module brings them up to the same standard
 * without touching anything that is not a display field.
 *
 * Guarantees:
 *
 *   - **Idempotent.** Running it twice produces the same row as running it
 *     once, which is what makes the backfill safe to re-run.
 *   - **Non-destructive.** `id`, `url`, `provider`, `externalId`, `postedAt`,
 *     `isDeveloperJob`, `status` and the timestamps are never modified, so no
 *     record can be lost and no bookmark or application is affected.
 *   - **Identity preserving.** The dedup identity (`provider + externalId`, or
 *     the URL fallback) is only ever *recovered* from data already stored, never
 *     invented, and no unique constraint is changed.
 */
import { normalizeJobRecord, type JobRecordInput } from "./job-record.js";
import { normalizeUrl, externalIdFromUrl } from "./normalize.js";

/** The stored columns this module is allowed to rewrite. */
export interface RenormalizableJob {
  title: string;
  company: string;
  location: string;
  workMode: string;
  jobType: string;
  experience: string | null;
  salary: string | null;
  description: string | null;
  skills: unknown;
  source: string;
}

export interface RenormalizeResult {
  /** Canonical values for the writable columns. */
  fields: ReturnType<typeof normalizeJobRecord> & {
    /** Present only when an identity could be recovered from stored data. */
    externalId?: string | null;
    url?: string;
  };
  /** True when at least one stored value would change. */
  changed: boolean;
  /** Field names whose value differs, for reporting. */
  changedFields: string[];
}

/**
 * The identity columns as stored.
 *
 * Extracted separately because the backfill needs the *current* values to
 * decide whether a field changed, while the repair of a missing `externalId`
 * must not itself count as a "normalization" change to the display fields.
 */
export interface StoredIdentity {
  provider: string | null;
  externalId: string | null;
  url: string;
}

/**
 * Recovers `externalId` when a row was stored without one.
 *
 * Only two sources are used, both already present on the row:
 *   1. an id-shaped path segment in the stored URL (Adzuna's numeric advert id)
 *   2. nothing else — a row without a recoverable id keeps `null`, which is
 *      valid, because `url` remains the dedup fallback.
 */
export function recoverExternalId(row: StoredIdentity): string | null {
  if (row.externalId) return row.externalId;
  if (!row.provider) return null;
  return externalIdFromUrl(row.url);
}

/**
 * Canonicalizes a stored URL.
 *
 * Applied only when the result is not already taken by another row; the caller
 * enforces that, because `url` is unique and two adverts that differ only by a
 * click id can collapse onto the same canonical form.
 */
export function canonicalizeStoredUrl(url: string): string | null {
  return normalizeUrl(url) ?? null;
}

/** Rebuilds the record input from a stored row, mapping stored values to source fields. */
function toRecordInput(row: RenormalizableJob): JobRecordInput {
  return {
    title: row.title,
    company: row.company,
    location: row.location,
    workMode: row.workMode,
    jobType: row.jobType,
    experience: row.experience,
    salary: row.salary,
    description: row.description,
    skills: row.skills,
    source: row.source,
    // The stored `source` is the display name and is authoritative; there is no
    // provider on this interface, so it is passed through as the source.
    provider: null,
  };
}

/** Compares a stored value with its canonical form, treating null/"" as equal. */
function sameValue(stored: unknown, next: unknown): boolean {
  if (stored === null || stored === undefined || stored === "") {
    return next === null || next === undefined;
  }
  if (Array.isArray(stored) && Array.isArray(next)) {
    return (
      stored.length === next.length &&
      stored.every((value, index) => value === next[index])
    );
  }
  return stored === next;
}

/**
 * Computes the canonical field set for a stored row and reports what changed.
 *
 * Note that `workMode` and `jobType` are re-derived through the same functions
 * the ingestion path uses, so a row written before those functions existed is
 * brought onto the current enum values.
 */
export function renormalizeJobRow(
  row: RenormalizableJob
): RenormalizeResult {
  const next = normalizeJobRecord(toRecordInput(row));

  const changedFields: string[] = [];
  const compare = (name: string, stored: unknown, value: unknown) => {
    if (!sameValue(stored, value)) changedFields.push(name);
  };

  compare("title", row.title, next.title);
  compare("company", row.company, next.company);
  compare("location", row.location, next.location);
  compare("workMode", row.workMode, next.workMode);
  compare("jobType", row.jobType, next.jobType);
  compare("experience", row.experience, next.experience);
  compare("salary", row.salary, next.salary);
  compare("description", row.description, next.description);
  compare("skills", row.skills, next.skills);
  compare("source", row.source, next.source);

  return { fields: next, changed: changedFields.length > 0, changedFields };
}
