/**
 * Contract every job source implements. The aggregation pipeline only depends
 * on this interface, so new providers can be added without touching it.
 *
 * Providers are responsible for asking their upstream API for developer roles
 * where the API supports it; the pipeline independently rejects anything that is
 * not a developer job, so a provider without upstream filtering is still safe.
 */
export interface FetchedJobs {
  jobs: unknown[];
}

export interface JobProvider {
  readonly name: string;
  fetchJobs(): Promise<FetchedJobs>;
}

export function withDefaultProviderQuery(
  urlValue: string,
  defaults: Record<string, string>
): string {
  const url = new URL(urlValue);
  for (const [key, value] of Object.entries(defaults)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}
