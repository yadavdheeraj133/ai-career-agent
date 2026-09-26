import { AIProvider } from "./ai.provider.js";
import { AgentRouterProvider } from "./agent-router.provider.js";
import { MockAIProvider } from "./mock.provider.js";
import {
  AIProviderName,
  AgentRouterConfig,
  resolveAgentRouterConfig,
} from "../config/ai-config.js";
import { AIProviderError } from "./ai-provider.error.js";

export function resolveAIProviderName(): AIProviderName {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();

  // Production must never silently return fabricated output. This guard has to
  // run before the name is matched, otherwise AI_PROVIDER=mock would be
  // accepted in production simply because "mock" is a recognised name.
  if (process.env.NODE_ENV === "production" && raw !== "agent-router") {
    throw new AIProviderError(
      "AI_NOT_CONFIGURED",
      `AI_PROVIDER must be "agent-router" in production (got "${raw ?? "(unset)"}"). ` +
        `Set AI_PROVIDER=agent-router with AGENT_ROUTER_API_KEY and AGENT_ROUTER_MODEL. ` +
        `Mock AI output is not allowed in production.`
    );
  }

  if (raw === "agent-router") return "agent-router";
  if (raw === "mock" || raw === "dev") return "mock";

  if (raw !== undefined && raw !== "") {
    throw new AIProviderError(
      "AI_NOT_CONFIGURED",
      `Unsupported AI_PROVIDER "${raw}". Expected "agent-router" or "mock". ` +
        `Set AI_PROVIDER=agent-router in .env along with AGENT_ROUTER_API_KEY and AGENT_ROUTER_MODEL, ` +
        `or use AI_PROVIDER=mock for local development.`
    );
  }

  return "mock";
}

function createAIProvider(): AIProvider {
  if (resolveAIProviderName() === "agent-router") {
    return new AgentRouterProvider();
  }
  return new MockAIProvider();
}

let cachedProvider: AIProvider | null = null;

function getProvider(): AIProvider {
  if (!cachedProvider) {
    cachedProvider = createAIProvider();
  }
  return cachedProvider;
}

/**
 * Drops the memoized provider. Only meaningful after the environment changes,
 * which in practice means tests and the connection-check script.
 */
export function resetAIProvider(): void {
  cachedProvider = null;
}

// Lazy proxy: do NOT create the provider at import time, otherwise a missing
// or invalid AI_PROVIDER crashes the whole API even for non-AI routes.
// The provider is created on first generate() call so startup always succeeds
// and misconfiguration surfaces as a clear AI-route error instead.
//
// Configuration errors are translated here so that a missing API key reaches
// the client as a clear "not configured" response rather than a generic 500.
export const aiProvider: AIProvider = {
  async generate(request) {
    try {
      return await getProvider().generate(request);
    } catch (error) {
      if (error instanceof AIProviderError) throw error;

      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("is not configured")) {
        throw new AIProviderError("AI_NOT_CONFIGURED", message);
      }

      throw error;
    }
  },
};

/**
 * Sends one real prompt through the configured AgentRouter model and returns the
 * generated text. Used by the backend-only connection check; the application
 * itself always goes through `AIService`.
 */
export async function verifyAgentRouterConnection(
  config: AgentRouterConfig = resolveAgentRouterConfig()
): Promise<{ content: string; model: string }> {
  const provider = new AgentRouterProvider(config);

  const response = await provider.generate({
    systemPrompt:
      "You are a connectivity probe. Reply with the requested text only.",
    userPrompt: "Reply with exactly: AGENTROUTER_OK",
    temperature: 0,
    maxTokens: 64,
    jsonMode: false,
  });

  return { content: response.content, model: response.model };
}
