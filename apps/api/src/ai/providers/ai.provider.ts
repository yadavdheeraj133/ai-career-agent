import type { AIRequest, AIResponse } from "../types/index.js";

export type { AIRequest, AIResponse };

export interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}
