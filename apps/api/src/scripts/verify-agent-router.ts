/**
 * ------------------------------------------------------------------
 * AgentRouter connection check
 * ------------------------------------------------------------------
 * Backend-only. Proves that the configured AgentRouter credentials reach
 * AgentRouter, that the configured model answers, and that the response is
 * parsed into usable text — before any application feature depends on it.
 *
 * No HTTP server, no database, no frontend. It exercises the exact provider the
 * application uses, so a pass here means the application path works.
 *
 *   pnpm --filter @repo/api ai:verify
 *   pnpm --filter @repo/api ai:verify -- --runs 5
 *   pnpm --filter @repo/api ai:verify -- --list-models
 *
 * Exit code 0 means every attempt returned a real model response.
 * ------------------------------------------------------------------
 */
import "../config/env.js";

import {
  AgentRouterConfigError,
  describeAgentRouterConfig,
  resolveAgentRouterConfig,
} from "../ai/config/ai-config.js";
import {
  AIProviderError,
  isAIProviderError,
} from "../ai/providers/ai-provider.error.js";
import { verifyAgentRouterConnection } from "../ai/providers/index.js";

const EXPECTED = "AGENTROUTER_OK";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function listModels(): Promise<void> {
  const config = resolveAgentRouterConfig();
  const url = `${config.baseUrl}/models`;

  process.stdout.write(`GET ${url}\n`);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "User-Agent": config.userAgent,
    },
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  const raw = await response.text();

  process.stdout.write(`HTTP ${response.status}\n`);

  if (!response.ok) {
    process.stdout.write(`${raw.slice(0, 500)}\n`);
    process.exitCode = 1;
    return;
  }

  const parsed = JSON.parse(raw) as { data?: { id?: string }[] };
  const ids = (parsed.data ?? []).map((model) => model.id).filter(Boolean);

  process.stdout.write(
    `Configured model: ${config.model}${ids.includes(config.model) ? "" : "  (NOT in catalog)"}\n`
  );
  process.stdout.write(`Available models: ${ids.join(", ") || "(none)"}\n`);

  if (!ids.includes(config.model)) process.exitCode = 1;
}

async function main(): Promise<void> {
  if (process.argv.includes("--list-models")) {
    await listModels();
    return;
  }

  const runs = Number.parseInt(argValue("--runs") ?? "3", 10);
  if (!Number.isFinite(runs) || runs < 1) {
    process.stderr.write("--runs must be a positive integer.\n");
    process.exit(2);
  }

  let config;
  try {
    config = resolveAgentRouterConfig();
  } catch (error) {
    if (error instanceof AgentRouterConfigError) {
      process.stderr.write(`CONFIGURATION ERROR: ${error.message}\n`);
      process.exit(2);
    }
    throw error;
  }

  process.stdout.write("AgentRouter connection check\n");
  process.stdout.write("=============================\n");
  for (const [key, value] of Object.entries(describeAgentRouterConfig(config))) {
    process.stdout.write(`  ${key.padEnd(10)} ${value}\n`);
  }
  process.stdout.write(`  endpoint   ${config.baseUrl}/chat/completions\n`);
  process.stdout.write(`  runs       ${runs}\n\n`);

  let failures = 0;

  for (let attempt = 1; attempt <= runs; attempt += 1) {
    const startedAt = Date.now();

    try {
      const { content, model } = await verifyAgentRouterConnection(config);
      const elapsed = Date.now() - startedAt;

      if (content !== EXPECTED) {
        failures += 1;
        process.stdout.write(
          `run ${attempt}: FAIL  HTTP 200 but unexpected content ${JSON.stringify(content)} (${elapsed}ms)\n`
        );
        continue;
      }

      process.stdout.write(
        `run ${attempt}: PASS  model=${model} content=${JSON.stringify(content)} (${elapsed}ms)\n`
      );
    } catch (error) {
      failures += 1;
      const elapsed = Date.now() - startedAt;
      const code = isAIProviderError(error) ? error.code : "UNEXPECTED";
      const detail =
        error instanceof AIProviderError || error instanceof Error
          ? error.message
          : String(error);
      const status = isAIProviderError(error) && error.upstreamStatus
        ? ` upstream=${error.upstreamStatus}`
        : "";

      process.stdout.write(
        `run ${attempt}: FAIL  ${code}${status} (${elapsed}ms)\n          ${detail}\n`
      );
    }
  }

  process.stdout.write(
    `\n${failures === 0 ? "SUCCESS" : "FAILURE"}: ${runs - failures}/${runs} run(s) returned a real model response.\n`
  );

  if (failures > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  if (error instanceof AIProviderError) {
    process.stderr.write(`FAILED [${error.code}]: ${error.message}\n`);
  } else {
    process.stderr.write(
      `FAILED: ${error instanceof Error ? error.message : String(error)}\n`
    );
  }
  process.exit(1);
});
