import { TransientError } from "../retry.js";
import type { FetchedJobs, JobProvider } from "./job-provider.js";

export interface JobicyProviderOptions {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface JobicyJob {
  id?: number;
  url?: string;
  jobSlug?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
}

interface JobicyResponse {
  jobs?: JobicyJob[];
}

/**
 * Jobicy public remote-jobs API provider.
 *
 * Endpoint: https://jobicy.com/api/v2/remote-jobs (JSON, no authentication).
 * Optional query parameters (`count`, `tag`, `geo`, `industry`) can be baked
 * into the configured URL. Jobicy only publishes remote listings, so workMode
 * is set to "Remote".
 */
export class JobicyJobProvider implements JobProvider {
  readonly name = "jobicy";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: JobicyProviderOptions) {
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
      if (!url.searchParams.has("industry")) {
        url.searchParams.set("industry", "engineering");
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
        `Provider "jobicy" request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new TransientError(
        `Provider "jobicy" responded with status ${response.status}`
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new TransientError(`Provider "jobicy" returned invalid JSON`, {
        cause: error,
      });
    }

    const record = payload as Partial<JobicyResponse>;
    if (!Array.isArray(record.jobs)) {
      throw new TransientError(
        `Provider "jobicy" response did not contain a jobs array`
      );
    }

    return {
      jobs: record.jobs.map((job) => this.mapJob(job)),
    };
  }

  private mapJob(job: JobicyJob): Record<string, unknown> {
    return {
      title: job.jobTitle,
      company: job.companyName,
      location: job.jobGeo,
      workMode: "Remote",
      jobType: Array.isArray(job.jobType) ? job.jobType[0] : undefined,
      experience: job.jobLevel,
      description: job.jobDescription || job.jobExcerpt,
      salary: this.buildSalary(job),
      source: "Jobicy",
      provider: this.name,
      externalId: typeof job.id === "number" ? String(job.id) : undefined,
      url: job.url,
      postedAt: job.pubDate,
    };
  }

  private buildSalary(job: JobicyJob): string | undefined {
    const bounds = [job.salaryMin, job.salaryMax]
      .filter((value): value is number => typeof value === "number" && value > 0)
      .map((value) => value.toLocaleString("en-US"));

    if (bounds.length === 0) return undefined;

    const currency =
      typeof job.salaryCurrency === "string" && job.salaryCurrency
        ? ` ${job.salaryCurrency}`
        : "";
    const period =
      typeof job.salaryPeriod === "string" && job.salaryPeriod
        ? ` (${job.salaryPeriod})`
        : "";

    return `${bounds.join(" - ")}${currency}${period}`;
  }
}