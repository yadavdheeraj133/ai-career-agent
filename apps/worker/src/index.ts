import "./env.js";

import {
  createAutomationRuntime,
  loadAutomationConfig,
  type AutomationConfig,
} from "@repo/api/automation";

import { logger } from "./logger.js";

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

async function main(): Promise<void> {
  const config: AutomationConfig = loadAutomationConfig();
  const runtime = createAutomationRuntime(config, { logger });

  logger.info("Automation worker starting", {
    enabled: config.enabled,
    providers: runtime.providers.map((provider) => provider.name),
    fetchIntervalMs: config.fetchIntervalMs,
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("Automation worker shutting down", { signal });
    runtime.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await runtime.start();
  logger.info("Automation worker ready");
}

main().catch((error: unknown) => {
  logger.error("Automation worker failed to start", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
