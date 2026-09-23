/**
 * Composition root for the automation runtime: wires config -> providers ->
 * ingestion/expiration/enrichment -> scheduler.
 *
 * The worker (`apps/worker`) starts this; the API server never does, so importing
 * the API for tests stays side-effect free.
 */
import {
  type AutomationConfig,
  loadAutomationConfig,
} from "./config.js";
import {
  AutomationAggregationService,
  type AggregationDeps,
} from "./aggregation.service.js";
import { IngestionService } from "./ingestion.service.js";
import { ExpirationService } from "./expiration.service.js";
import { AiEnrichmentService } from "./ai-enrichment.service.js";
import { NotificationCleanupService } from "./notification-cleanup.service.js";
import { AutomationScheduler, type ScheduledTask } from "./scheduler.js";
import { createProviders } from "./providers/index.js";
import type { JobProvider } from "./providers/index.js";

export interface AutomationRuntimeDeps extends AggregationDeps {
  providers?: JobProvider[];
}

export interface AutomationRuntime {
  config: AutomationConfig;
  providers: JobProvider[];
  scheduler: AutomationScheduler;
  runOnce: (name: string) => Promise<unknown>;
  runAll: () => Promise<unknown[]>;
  start: () => Promise<void>;
  stop: () => void;
}

export function createAutomationRuntime(
  config: AutomationConfig = loadAutomationConfig(),
  deps: AutomationRuntimeDeps = {}
): AutomationRuntime {
  const logger = deps.logger;
  const providers = deps.providers ?? createProviders(config);

  const aggregation = new AutomationAggregationService({
    ...(deps.jobs ? { jobs: deps.jobs } : {}),
    ...(deps.notifications ? { notifications: deps.notifications } : {}),
    ...(logger ? { logger } : {}),
  });

  const ingestion = new IngestionService(aggregation, {
    maxAttempts: config.maxAttempts,
    baseBackoffMs: config.baseBackoffMs,
    maxBackoffMs: config.maxBackoffMs,
    maxJobsPerProvider: config.maxJobsPerProvider,
    ...(logger ? { logger } : {}),
  });

  const expiration = new ExpirationService({
    ...(logger ? { logger } : {}),
  });

  const enrichment = new AiEnrichmentService({
    ...(logger ? { logger } : {}),
  });

  const notificationCleanup = new NotificationCleanupService({
    ...(logger ? { logger } : {}),
  });

  const tasks: ScheduledTask[] = [
    {
      name: "job-fetch",
      intervalMs: config.fetchIntervalMs,
      run: () => ingestion.runAll(providers),
    },
    {
      name: "job-expire",
      intervalMs: config.expireIntervalMs,
      run: () => expiration.expireStale(config.jobTtlMs),
    },
  ];

  if (config.aiEnrichment.enabled) {
    tasks.push({
      name: "ai-enrichment",
      intervalMs: config.aiEnrichment.intervalMs,
      run: () => enrichment.enrich(config.aiEnrichment.limit, true),
    });
  }

  tasks.push({
    name: "notification-cleanup",
    intervalMs: config.notificationCleanup.intervalMs,
    run: () => notificationCleanup.cleanup(config.notificationCleanup.ttlMs),
  });

  const scheduler = new AutomationScheduler(tasks, logger);

  return {
    config,
    providers,
    scheduler,
    runOnce: (name) => scheduler.runOnce(name),
    runAll: () => scheduler.runAll().then(() => []),
    start: async () => {
      if (!config.enabled) {
        logger?.warn("Automation disabled via AUTOMATION_ENABLED");
        return;
      }
      if (config.runOnStart) {
        await scheduler.runAll();
      }
      scheduler.start();
    },
    stop: () => scheduler.stop(),
  };
}
