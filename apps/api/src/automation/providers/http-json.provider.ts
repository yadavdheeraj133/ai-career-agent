import { HttpError, TransientError } from "../retry.js";
import type { FetchedJobs, JobProvider } from "./job-provider.js";

export interface HttpJsonProviderOptions {
  name: string;
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Dot path to the jobs array, e.g. "data.jobs". Defaults to common keys. */
  jobsPath?: string;
  fetchImpl?: typeof fetch;
}

function pickJobs(payload: unknown, jobsPath?: string): unknown[] | null {
  if (Array.isArray(payload)) return payload;

  if (jobsPath) {
    const value = jobsPath
      .split(".")
      .reduce<unknown>(
        (current, key) =>
          current && typeof current === "object"
            ? (current as Record<string, unknown>)[key]
            : undefined,
        payload
      );
    return Array.isArray(value) ? value : null;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["jobs", "data", "results", "items"]) {
      const value = record[key];
      if (Array.isArray(value)) return value;
    }
  }

  return null;
}

/**
 * Generic provider for any HTTP endpoint that returns job JSON. The URL and any
 * auth header values come from configuration/environment only; nothing is
 * hardcoded here.
 */
export class HttpJsonJobProvider implements JobProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: HttpJsonProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get name(): string {
    return this.options.name;
  }

  async fetchJobs(): Promise<FetchedJobs> {
    const controller = new AbortController();
    const timeoutMs = this.options.timeoutMs ?? 10_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(this.options.url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(this.options.headers ?? {}),
        },
        signal: controller.signal,
      });
    } catch (error) {
      throw new TransientError(
        `Provider "${this.name}" request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new HttpError(
        response.status,
        `Provider "${this.name}" responded with status ${response.status}`
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new TransientError(
        `Provider "${this.name}" returned invalid JSON`,
        { cause: error }
      );
    }

    const jobs = pickJobs(payload, this.options.jobsPath);
    if (!jobs) {
      throw new TransientError(
        `Provider "${this.name}" response did not contain a jobs array`
      );
    }

    return { jobs };
  }
}
