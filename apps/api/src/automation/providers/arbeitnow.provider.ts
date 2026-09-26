import { TransientError } from "../retry.js";
import type { FetchedJobs, JobProvider } from "./job-provider.js";

interface ArbeitnowProviderOptions {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface ArbeitnowJob {
  slug?: string;
  title?: string;
  company_name?: string;
  location?: string;
  remote?: boolean;
  job_types?: string[];
  tags?: string[];
  description?: string;
  url?: string;
  created_at?: number;
}

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

export class ArbeitnowJobProvider implements JobProvider {
  readonly name = "arbeitnow";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ArbeitnowProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchJobs(): Promise<FetchedJobs> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 10_000
    );

    try {
      const response = await this.fetchImpl(this.options.url, {
        headers: {
          Accept: "application/json",
          ...(this.options.headers ?? {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new TransientError(
          `Provider "${this.name}" responded with status ${response.status}`
        );
      }

      const payload = (await response.json()) as ArbeitnowResponse;
      if (!Array.isArray(payload.data)) {
        throw new TransientError(`Provider "${this.name}" response did not contain a data array`);
      }

      return {
        jobs: payload.data.map((job) => ({
          title: job.title,
          company: job.company_name,
          location: job.location,
          workMode: job.remote === true ? "Remote" : undefined,
          jobType: job.job_types?.[0],
          skills: job.tags,
          description: job.description,
          source: "Arbeitnow",
          provider: this.name,
          externalId: job.slug,
          url: job.url,
          postedAt:
            typeof job.created_at === "number"
              ? new Date(job.created_at * 1000).toISOString()
              : undefined,
        })),
      };
    } catch (error) {
      if (error instanceof TransientError) throw error;
      throw new TransientError(
        `Provider "${this.name}" request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    } finally {
      clearTimeout(timer);
    }
  }
}