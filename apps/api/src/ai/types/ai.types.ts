/**
 * ------------------------------------------------------------------
 * AI Module Shared Types
 * ------------------------------------------------------------------
 * Shared request/response types used across the AI module.
 * ------------------------------------------------------------------
 */

import type { AIProviderName } from "../config/ai-config.js";

export type { AIProviderName };

export interface AIRequest {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * Ask the provider for a JSON object. Every AI feature in this project parses
   * a Zod-validated object, so this defaults to true; it is only turned off for
   * plain-text callers such as the connection check.
   */
  jsonMode?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: AIUsage;
}

export interface AIProviderConfig {
  provider: AIProviderName;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}
