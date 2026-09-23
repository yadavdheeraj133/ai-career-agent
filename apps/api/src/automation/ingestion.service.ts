/**
 * Fetch orchestration: runs each provider through bounded retries and feeds the
 * result into the aggregation pipeline. Providers are isolated — one failing
 * source never prevents the others from running.
 */
import { withRetry } from "./retry.js";
import {
  type AggregationLogger,
  AutomationAggregationService,
} from "./aggregation.service.js";
import type { JobProvider } from "./providers/index.js";
import type { IngestSummary } from "./types.js";

export interface IngestionOptions {
  maxAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  maxJobsPerProvider: number;
  sleep?: (ms: number) => Promise<void>;
  logger?: AggregationLogger;
  onRetry?: (info: { provider: string; attempt: number }) => void;
}

export interface ProviderRunResult {
  provider: string;
  ok: boolean;
  summary?: IngestSummary;
  error?: string;
}

export class IngestionService {
  constructor(
    private readonly aggregation: AutomationAggregationService,
    private readonly options: IngestionOptions
  ) {}

  async runProvider(provider: JobProvider): Promise<ProviderRunResult> {
    try {
      const { jobs } = await withRetry(() => provider.fetchJobs(), {
        attempts: this.options.maxAttempts,
        baseDelayMs: this.options.baseBackoffMs,
        maxDelayMs: this.options.maxBackoffMs,
        ...(this.options.sleep ? { sleep: this.options.sleep } : {}),
        onRetry: ({ attempt }) =>
          this.options.onRetry?.({ provider: provider.name, attempt }),
      });

      const limited = jobs.slice(0, this.options.maxJobsPerProvider);
      const summary = await this.aggregation.ingest(limited, provider.name);

      return { provider: provider.name, ok: true, summary };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.logger?.error("Provider run failed", {
        provider: provider.name,
        error: message,
      });
      return { provider: provider.name, ok: false, error: message };
    }
  }

  /** Runs providers sequentially to avoid hammering the DB or sources. */
  async runAll(providers: JobProvider[]): Promise<ProviderRunResult[]> {
    const results: ProviderRunResult[] = [];
    for (const provider of providers) {
      results.push(await this.runProvider(provider));
    }
    return results;
  }
}
