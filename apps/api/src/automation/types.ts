/**
 * Shared types for the Phase 3 automation layer.
 *
 * The automation module lives inside the API package so it can reuse the
 * existing Prisma client, repositories and services, and so it is exercised by
 * the same isolated test database. `apps/worker` is a thin launcher on top.
 */

export type WorkMode = "Remote" | "Hybrid" | "Onsite" | "Not specified";

export type JobType =
  | "Full-time"
  | "Part-time"
  | "Internship"
  | "Contract"
  | "Freelance"
  | "Not specified";

export interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  jobType: JobType;
  experience?: string;
  salary?: string;
  description?: string;
  skills?: string[];
  source: string;
  provider: string | null;
  externalId: string | null;
  url: string;
  /** Provider-supplied posting date, when available. */
  postedAt?: Date;
  contentHash: string;
}

export interface InvalidJob {
  index: number;
  reason: string;
  raw: unknown;
}

export interface IngestSummary {
  provider: string;
  /** Records the provider returned. */
  fetched: number;
  /** Records proven to be developer-relevant and therefore eligible to store. */
  accepted: number;
  /** Records dropped because the role is not software/development/technical. */
  rejected: number;
  created: number;
  updated: number;
  skipped: number;
  /** Records dropped because they were not developer-relevant or were malformed. */
  invalid: number;
  /** Developer-relevant records not written because the per-provider cap was hit. */
  truncated: number;
  notificationsCreated: number;
  jobs: NormalizedJob[];
  errors: InvalidJob[];
}

export interface StoredJobRef {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
}
