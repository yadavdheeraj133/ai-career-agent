import { AIProvider } from "./ai.provider.js";
import { AgentRouterProvider } from "./agent-router.provider.js";
// import { OllamaProvider } from "./ollama.provider.js";


function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  switch (provider) {
    case "agent-router":
      return new AgentRouterProvider();

    // case "ollama":
    //   return new OllamaProvider();

    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}". Expected "agent-router". Set AI_PROVIDER=agent-router in .env along with AGENT_ROUTER_BASE_URL, AGENT_ROUTER_API_KEY and AGENT_ROUTER_MODEL.`
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