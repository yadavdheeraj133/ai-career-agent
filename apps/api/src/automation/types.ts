/**
 * Shared types for the Phase 3 automation layer.
 *
 * The automation module lives inside the API package so it can reuse the
 * existing Prisma client, repositories and services, and so it is exercised by
 * the same isolated test database. `apps/worker` is a thin launcher on top.
 */

export type WorkMode = "Remote" | "Hybrid" | "Onsite";

export type JobType =
  | "Full-time"
  | "Part-time"
  | "Internship"
  | "Contract"
  | "Freelance";

export interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  jobType: JobType;
  experience?: string;
  salary?: string;
  description?: string;
  source: string;
  provider: string | null;
  externalId: string | null;
  url: string;
  contentHash: string;
}

export interface InvalidJob {
  index: number;
  reason: string;
  raw: unknown;
}

export interface IngestSummary {
  provider: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
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
