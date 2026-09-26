import { TransientError } from "../retry.js";
import type { FetchedJobs, JobProvider } from "./job-provider.js";

export interface RemoteOkProviderOptions {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface RemoteOkJob {
  id?: string;
  slug?: string;
  company?: string;
  position?: string;
  location?: string;
  tags?: string[];
  description?: string;
  url?: string;
  epoch?: number;
  date?: string;
}

/** Whether a payload element is an actual job listing rather than the
 * leading legal-notice record that Remote OK prepends to its API response. */
function isJobRecord(value: unknown): value is RemoteOkJob {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.position === "string" &&
    record.position.trim().length > 0 &&
    record.id !== undefined &&
    record.id !== null
  );
}

/**
 * Remote OK public jobs API provider.
 *
 * Endpoint: https://remoteok.com/api returns a JSON array of job listings;
 * the first element is a legal/attribution notice, which is skipped. No
 * authentication or API key is required. Remote OK only lists remote jobs.
 */
export class RemoteOkJobProvider implements JobProvider {
  readonly name = "remoteok";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: RemoteOkProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchJobs(): Promise<FetchedJobs> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 10_000
    );

    let response: Response;
    try {
      const url = new URL(this.options.url);
      if (!url.searchParams.has("tag") && !url.searchParams.has("tags")) {
        url.searchParams.set("tag", "dev");
      }
      response = await this.fetchImpl(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(this.options.headers ?? {}),
        },
        signal: controller.signal,
      });
    } catch (error) {
      throw new TransientError(
        `Provider "remoteok" request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new TransientError(
        `Provider "remoteok" responded with status ${response.status}`
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new TransientError(`Provider "remoteok" returned invalid JSON`, {
        cause: error,
      });
    }

    if (!Array.isArray(payload)) {
      throw new TransientError(
        `Provider "remoteok" response was not a JSON array`
      );
    }

    const jobs = payload.filter(isJobRecord);

    return {
      jobs: jobs.map((job) => this.mapJob(job)),
    };
  }

  private mapJob(job: RemoteOkJob): Record<string, unknown> {
    return {
      title: job.position,
      company: job.company,
      location: job.location && job.location.trim().length > 0 ? job.location.trim() : undefined,
      // Stated explicitly rather than left to the normalizer's location
      // heuristic: the feed only ever carries remote listings, and most records
      // publish no `location` at all, so there is nothing else to derive from.
      // This is a fact about the feed, not a guess from the board's name - the
      // normalizer still refuses to infer a work mode from a provider name.
      workMode: "Remote",
      description: job.description,
      source: "Remote OK",
      provider: this.name,
      externalId: job.id,
      url: job.url,
      postedAt:
        typeof job.date === "string"
          ? job.date
          : typeof job.epoch === "number"
            ? new Date(job.epoch * 1000).toISOString()
            : undefined,
    };
  }
}