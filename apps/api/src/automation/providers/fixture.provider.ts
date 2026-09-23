import type { FetchedJobs, JobProvider } from "./job-provider.js";

/**
 * In-memory provider used by tests and local development. It never performs
 * network I/O, so worker tests do not depend on any external service.
 */
export class FixtureJobProvider implements JobProvider {
  constructor(
    public readonly name: string,
    private readonly jobs: unknown[]
  ) {}

  async fetchJobs(): Promise<FetchedJobs> {
    return { jobs: this.jobs.map((job) => ({ ...(job as object) })) };
  }
}
