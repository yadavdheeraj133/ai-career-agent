/**
 * Automation configuration, read from environment variables with safe defaults.
 *
 * No secret is hardcoded: provider URLs and any auth headers come from the
 * environment, and scheduling/retry limits are tunable per deployment.
 */
import { readFileSync } from "node:fs";

export interface ProviderEnvConfig {
  name: string;
  url: string;
  jobsPath?: string;
  headers: Record<string, string>;
}

export interface AutomationConfig {
  enabled: boolean;
  runOnStart: boolean;
  fetchIntervalMs: number;
  expireIntervalMs: number;
  jobTtlMs: number;
  maxAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  maxJobsPerProvider: number;
  providers: ProviderEnvConfig[];
  fixtureFile: string | null;
  aiEnrichment: {
    enabled: boolean;
    intervalMs: number;
    limit: number;
  };
  notificationCleanup: {
    intervalMs: number;
    ttlMs: number;
  };
}

type Env = Record<string, string | undefined>;

function readInt(env: Env, key: string, fallback: number): number {
  const raw = env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBool(env: Env, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

function readHeaders(env: Env): Record<string, Record<string, string>> {
  const raw = env.JOB_PROVIDER_HEADERS;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, Record<string, string>> = {};
    for (const [name, headers] of Object.entries(parsed)) {
      if (headers && typeof headers === "object") {
        result[name] = Object.fromEntries(
          Object.entries(headers as Record<string, unknown>)
            .filter(([, value]) => typeof value === "string")
            .map(([key, value]) => [key, value as string])
        );
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** Parses `JOB_PROVIDER_URLS="name|https://.../jobs,name2|https://...,..."`. */
export function parseProviderUrls(
  raw: string | undefined,
  headers: Record<string, Record<string, string>> = {}
): ProviderEnvConfig[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const [name, url, jobsPath] = entry.split("|").map((part) => part.trim());
      if (!name || !url) return [];
      return [
        {
          name,
          url,
          jobsPath: jobsPath || undefined,
          headers: headers[name] ?? {},
        },
      ];
    });
}

/** Load provider URLs and headers from environment for registry-based creation. */
export function loadProviderConfig(env: Env = process.env): {
  providerUrls: string;
  providerHeaders: Record<string, Record<string, string>>;
} {
  return {
    providerUrls: env.JOB_PROVIDER_URLS ?? "",
    providerHeaders: readHeaders(env),
  };
}

export function loadAutomationConfig(env: Env = process.env): AutomationConfig {
  const headers = readHeaders(env);

  return {
    enabled: readBool(env, "AUTOMATION_ENABLED", true),
    runOnStart: readBool(env, "AUTOMATION_RUN_ON_START", true),
    fetchIntervalMs: readInt(env, "JOB_FETCH_INTERVAL_MS", 15 * 60 * 1000),
    expireIntervalMs: readInt(env, "JOB_EXPIRE_INTERVAL_MS", 6 * 60 * 60 * 1000),
    jobTtlMs: readInt(env, "JOB_TTL_MS", 30 * 24 * 60 * 60 * 1000),
    maxAttempts: readInt(env, "AUTOMATION_MAX_ATTEMPTS", 3),
    baseBackoffMs: readInt(env, "AUTOMATION_BASE_BACKOFF_MS", 200),
    maxBackoffMs: readInt(env, "AUTOMATION_MAX_BACKOFF_MS", 5_000),
    maxJobsPerProvider: readInt(env, "JOB_MAX_PER_PROVIDER", 500),
    providers: parseProviderUrls(env.JOB_PROVIDER_URLS, headers),
    fixtureFile: env.JOB_FIXTURE_FILE?.trim() || null,
    aiEnrichment: {
      enabled: readBool(env, "AI_ENRICHMENT_ENABLED", false),
      intervalMs: readInt(env, "AI_ENRICHMENT_INTERVAL_MS", 60 * 60 * 1000),
      limit: readInt(env, "AI_ENRICHMENT_LIMIT", 5),
    },
    notificationCleanup: {
      intervalMs: readInt(
        env,
        "NOTIFICATION_CLEANUP_INTERVAL_MS",
        6 * 60 * 60 * 1000
      ),
      ttlMs: readInt(env, "NOTIFICATION_TTL_MS", 30 * 24 * 60 * 60 * 1000),
    },
  };
}

/** Reads a JSON array of raw jobs from a fixture file (dev/testing aid). */
export function readFixtureJobs(file: string): unknown[] {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (Array.isArray(parsed)) return parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { jobs?: unknown }).jobs)
    ) {
      return (parsed as { jobs: unknown[] }).jobs;
    }
    return [];
  } catch {
    return [];
  }
}
