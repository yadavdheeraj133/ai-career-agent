import { AIProvider } from "../providers/ai.provider.js";
import { aiProvider } from "../providers/index.js";
import { AIRequest, AIResponse } from "../types/index.js";

/**
 * ------------------------------------------------------------------
 * AI Service
 * ------------------------------------------------------------------
 * Central entry point for all AI requests.
 * Controllers should interact ONLY with this service.
 * ------------------------------------------------------------------
 */
export class AIService {
  constructor(private readonly Provider: AIProvider = aiProvider) {}

  async generate(request: AIRequest): Promise<AIResponse> {
    return this.Provider.generate(request);
  }
}

export const aiService = new AIService();