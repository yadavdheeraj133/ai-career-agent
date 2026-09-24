import { AIProvider } from "./ai.provider.js";
import { AgentRouterProvider } from "./agent-router.provider.js";
import { MockAIProvider } from "./mock.provider.js";

function createAIProvider(): AIProvider {
  const raw = process.env.AI_PROVIDER?.toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";

  // Production must never silently return fabricated output. Mock output is
  // only allowed outside production for local development and tests.
  if (isProduction) {
    if (raw !== "agent-router") {
      throw new Error(
        `AI_PROVIDER must be "agent-router" in production (got "${raw ?? "(unset)"}"). ` +
          `Set AI_PROVIDER=agent-router with AGENT_ROUTER_BASE_URL, AGENT_ROUTER_API_KEY and AGENT_ROUTER_MODEL. Mock AI output is not allowed in production.`
      );
    }
    return new AgentRouterProvider();
  }

  const provider = raw ?? "mock";

  switch (provider) {
    case "agent-router":
      return new AgentRouterProvider();

    case "mock":
    case "dev":
      return new MockAIProvider();

    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}". Expected "agent-router" or "mock". Set AI_PROVIDER=agent-router in .env along with AGENT_ROUTER_BASE_URL, AGENT_ROUTER_API_KEY and AGENT_ROUTER_MODEL, or use AI_PROVIDER=mock for local development.`
      );
  }
}

let cachedProvider: AIProvider | null = null;

function getProvider(): AIProvider {
  if (!cachedProvider) {
    cachedProvider = createAIProvider();
  }
  return cachedProvider;
}

// Lazy proxy: do NOT create the provider at import time, otherwise a missing
// or invalid AI_PROVIDER crashes the whole API even for non-AI routes.
// The provider is created on first generate() call so startup always succeeds
// and misconfiguration surfaces as a clear AI-route error instead.
export const aiProvider: AIProvider = {
  async generate(request) {
    return getProvider().generate(request);
  },
};