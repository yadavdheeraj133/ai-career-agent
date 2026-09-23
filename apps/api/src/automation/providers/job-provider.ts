/**
 * Contract every job source implements. The aggregation pipeline only depends
 * on this interface, so new providers can be added without touching it.
 */
export interface FetchedJobs {
  jobs: unknown[];
}

export interface JobProvider {
  readonly name: string;
  fetchJobs(): Promise<FetchedJobs>;
}
