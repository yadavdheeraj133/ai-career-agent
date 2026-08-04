import { AIProvider } from "./ai.provider.js";
import { OllamaProvider } from "./ollama.provider.js";
// import { OpenRouterProvider } from "./openrouter.provider.js";

function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  switch (provider) {
    case "ollama":
      return new OllamaProvider();

    // case "openrouter":
    //   return new OpenRouterProvider();

    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}". Expected "ollama" or "openrouter".`
      );
  }
}

export const aiProvider = createAIProvider();