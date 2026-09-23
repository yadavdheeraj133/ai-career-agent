/**
 * ------------------------------------------------------------------
 * AI Module Shared Types
 * ------------------------------------------------------------------
 * Shared request/response types used across the AI module.
 * ------------------------------------------------------------------
 */

export type AIProviderName =
  | "agent-router"
  | "ollama"
  | "openrouter";

export interface AIRequest {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  model: string;
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