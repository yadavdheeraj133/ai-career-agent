import { HttpError, PermanentError, TransientError } from "../retry.js";
import {
  withDefaultProviderQuery,
  type FetchedJobs,
  type JobProvider,
} from "./job-provider.js";

export interface AdzunaProviderOptions {
  url: string;
  appId: string;
  appKey: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface AdzunaCompany {
  display_name?: string;
  id?: number;
}

interface AdzunaLocation {
  display_name?: string;
  area?: string[];
}

interface AdzunaResult {
  id?: number;
  title?: string;
  company?: AdzunaCompany;
  location?: AdzunaLocation;
  description?: string;
  redirect_url?: string;
  created?: string;
  contract_time?: string;
}

interface AdzunaResponse {
  results?: AdzunaResult[];
}

/**
 * Adzuna Jobs API provider.
 *
 * The REST endpoint returns job adverts for one country per call and requires
 * two query parameters, `app_id` and `app_key`, obtained by registering a free
 * API key at https://developer.adzuna.com. Credentials are configuration-only
 * and never hardcoded; a missing key fails fast with a permanent error instead
 * of retrying a request that can never succeed.
 */
export class AdzunaJobProvider implements JobProvider {
  readonly name = "adzuna";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: AdzunaProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchJobs(): Promise<FetchedJobs> {
    if (!this.options.appId || !this.options.appKey) {
      throw new PermanentError(
        'Provider "adzuna" is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY (register at https://developer.adzuna.com).'
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 10_000
    );

    let response: Response;
    try {
      const url = new URL(
        withDefaultProviderQuery(this.options.url, {
          results_per_page: "50",
        })
      );
      url.searchParams.set("app_id", this.options.appId);
      url.searchParams.set("app_key", this.options.appKey);
      url.searchParams.set("content-type", "application/json");

      const hasDeveloperQuery = [
        "what",
        "what_and",
        "what_or",
        "what_phrase",
        "title_only",
        "category",
      ].some((key) => url.searchParams.has(key));
      if (!hasDeveloperQuery) {
        url.searchParams.set(
          "what_or",
          "software developer devops frontend backend full stack data machine learning ml artificial intelligence cloud qa automation cybersecurity"
        );
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
        `Provider "adzuna" request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // 401/403 means bad or missing app credentials; other 4xx are client
      // errors. Only 429/5xx are retryable, mirroring the shared retry policy.
      throw new HttpError(
        response.status,
        `Provider "adzuna" responded with status ${response.status}`
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new TransientError(`Provider "adzuna" returned invalid JSON`, {
        cause: error,
      });
    }

    const record = payload as Partial<AdzunaResponse>;
    if (!Array.isArray(record.results)) {
      throw new TransientError(
        `Provider "adzuna" response did not contain a results array`
      );
    }

    return {
      jobs: record.results.map((job) => this.mapJob(job)),
    };
  }

  private mapJob(job: AdzunaResult): Record<string, unknown> {
    return {
      title: job.title,
      company: job.company?.display_name,
      location: job.location?.display_name,
      jobType: job.contract_time,
      description: job.description,
      source: "Adzuna",
      provider: this.name,
      externalId: typeof job.id === "number" ? String(job.id) : undefined,
      url: job.redirect_url,
      postedAt: job.created,
    };
  }
}

/**
 * Builds an Adzuna provider from deployment environment configuration.
 * Credentials come from ADZUNA_APP_ID / ADZUNA_APP_KEY so the worker and the
 * registry share a single source of truth.
 */
export function adzunaProviderFromEnv(options: {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): AdzunaJobProvider {
  return new AdzunaJobProvider({
    url: options.url,
    appId: process.env.ADZUNA_APP_ID ?? "",
    appKey: process.env.ADZUNA_APP_KEY ?? "",
    headers: options.headers,
    timeoutMs: options.timeoutMs,
    fetchImpl: options.fetchImpl,
  });
}