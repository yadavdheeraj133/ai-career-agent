import { TransientError } from "../retry.js";
import type { FetchedJobs, JobProvider } from "./job-provider.js";

export interface TheMuseProviderOptions {
  url: string;
  /** Optional registered-app key passed as the `api_key` query parameter. */
  apiKey?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface MuseLocation {
  name?: string;
}

interface MuseCompany {
  name?: string;
  short_name?: string;
}

interface MuseResult {
  id?: number;
  name?: string;
  short_name?: string;
  publication_date?: string;
  locations?: MuseLocation[];
  levels?: { name?: string }[];
  tags?: string[];
  contents?: string;
  refs?: { landing_page?: string };
  company?: MuseCompany;
}

interface MuseResponse {
  results?: MuseResult[];
}

/**
 * The Muse public jobs API.
 *
 * Endpoint: https://www.themuse.com/api/public/jobs?page=N
 * Anonymous calls work within a 500 requests/hour limit; registering a free
 * app at https://www.themuse.com/developers returns an `api_key` that raises
 * the limit to 3,600/hour and is passed as the `api_key` query parameter.
 * The provider treats HTTP 403 as a rate-limit (as documented) so it is
 * retried rather than classified as a permanent client error.
 */
export class TheMuseJobProvider implements JobProvider {
  readonly name = "themuse";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: TheMuseProviderOptions) {
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
      if (!url.searchParams.has("category")) {
        url.searchParams.set("category", "Software Engineer");
        url.searchParams.set("page", "0");
      }
      if (this.options.apiKey) {
        url.searchParams.set("api_key", this.options.apiKey);
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
        `Provider "themuse" request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new TransientError(
          `Provider "themuse" is rate limited (HTTP 403). Register an app and set THE_MUSE_API_KEY to raise the limit.`
        );
      }
      throw new TransientError(
        `Provider "themuse" responded with status ${response.status}`
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new TransientError(`Provider "themuse" returned invalid JSON`, {
        cause: error,
      });
    }

    const record = payload as Partial<MuseResponse>;
    if (!Array.isArray(record.results)) {
      throw new TransientError(
        `Provider "themuse" response did not contain a results array`
      );
    }

    return {
      jobs: record.results.map((job) => this.mapJob(job)),
    };
  }

  private mapJob(job: MuseResult): Record<string, unknown> {
    const locations = job.locations
      ?.map((location) => location.name)
      .filter((name): name is string => typeof name === "string");

    return {
      title: job.name,
      company: job.company?.name,
      location: locations?.[0],
      experience: job.levels?.[0]?.name,
      skills: job.tags,
      description: job.contents,
      source: "The Muse",
      provider: this.name,
      externalId: typeof job.id === "number" ? String(job.id) : undefined,
      url: job.refs?.landing_page,
      postedAt: job.publication_date,
    };
  }
}

/**
 * Builds a The Muse provider from deployment environment configuration.
 * An optional registered-app key is read from THE_MUSE_API_KEY.
 */
export function themuseProviderFromEnv(options: {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): TheMuseJobProvider {
  return new TheMuseJobProvider({
    url: options.url,
    apiKey: process.env.THE_MUSE_API_KEY,
    headers: options.headers,
    timeoutMs: options.timeoutMs,
    fetchImpl: options.fetchImpl,
  });
}