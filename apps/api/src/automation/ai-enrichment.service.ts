/**
 * Optional background AI enrichment.
 *
 * Disabled by default (`AI_ENRICHMENT_ENABLED`). When enabled it summarizes
 * active jobs that have not been enriched yet, reusing the existing interview
 * AI service. Failures are isolated per job and never stop the run.
 */
import type { Job, Prisma } from "@prisma/client";

import { jobRepository } from "../repositories/jobs.repository.js";
import { interviewAIService } from "../services/interview-ai.service.js";
import type { AggregationLogger } from "./aggregation.service.js";

export interface EnrichmentJobsRepo {
  findEnrichmentCandidates: (limit: number) => Promise<Job[]>;
  setEnrichment: (id: string, enrichment: Prisma.InputJsonValue) => Promise<Job>;
}

export interface AiEnrichmentDeps {
  jobs?: EnrichmentJobsRepo;
  summarize?: (description: string) => Promise<unknown>;
  logger?: AggregationLogger;
}

export interface EnrichmentResult {
  enabled: boolean;
  candidates: number;
  enriched: number;
  failed: number;
}

const silentLogger: AggregationLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export class AiEnrichmentService {
  private readonly jobs: EnrichmentJobsRepo;
  private readonly summarize: (description: string) => Promise<unknown>;
  private readonly logger: AggregationLogger;

  constructor(deps: AiEnrichmentDeps = {}) {
    this.jobs = deps.jobs ?? jobRepository;
    this.summarize =
      deps.summarize ??
      ((description) => interviewAIService.generateJobSummary(description));
    this.logger = deps.logger ?? silentLogger;
  }

  async enrich(limit: number, enabled: boolean): Promise<EnrichmentResult> {
    if (!enabled) {
      return { enabled: false, candidates: 0, enriched: 0, failed: 0 };
    }

    const candidates = await this.jobs.findEnrichmentCandidates(limit);
    let enriched = 0;
    let failed = 0;

    for (const job of candidates) {
      if (!job.description) continue;
      try {
        const enrichment = (await this.summarize(
          job.description
        )) as Prisma.InputJsonValue;
        await this.jobs.setEnrichment(job.id, enrichment);
        enriched += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn("Job enrichment failed", {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info("AI enrichment run completed", {
      candidates: candidates.length,
      enriched,
      failed,
    });

    return { enabled: true, candidates: candidates.length, enriched, failed };
  }
}
