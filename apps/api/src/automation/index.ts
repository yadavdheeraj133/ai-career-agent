/**
 * Public entry point for the automation layer.
 *
 * Exposed to the worker via the `@repo/api/automation` subpath export so the
 * worker package does not need to reach into API internals.
 */
export * from "./types.js";
export * from "./config.js";
export * from "./retry.js";
export * from "./normalize.js";
export * from "./job-record.js";
export * from "./renormalize.js";
export * from "./text/index.js";
export * from "./developer-classifier.js";
export * from "./developer-evidence.js";
export * from "./providers/index.js";
export * from "./aggregation.service.js";
export * from "./ingestion.service.js";
export * from "./expiration.service.js";
export * from "./ai-enrichment.service.js";
export * from "./notification-cleanup.service.js";
export * from "./scheduler.js";
export * from "./runtime.js";
