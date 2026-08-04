/**
 * ------------------------------------------------------------------
 * AI Error Service
 * ------------------------------------------------------------------
 * Centralized error handling for all AI-related operations.
 * ------------------------------------------------------------------
 */

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIError";
  }
}

export class AIErrorService {
  providerUnavailable(cause?: unknown): never {
    throw new AIError(
      "AI provider is unavailable.",
      "AI_PROVIDER_UNAVAILABLE",
      cause
    );
  }

  timeout(cause?: unknown): never {
    throw new AIError(
      "AI request timed out.",
      "AI_TIMEOUT",
      cause
    );
  }

  invalidResponse(cause?: unknown): never {
    throw new AIError(
      "AI returned an invalid response.",
      "AI_INVALID_RESPONSE",
      cause
    );
  }

  parsingFailed(cause?: unknown): never {
    throw new AIError(
      "Failed to parse AI response.",
      "AI_PARSE_ERROR",
      cause
    );
  }

  unknown(cause?: unknown): never {
    throw new AIError(
      "Unknown AI error occurred.",
      "AI_UNKNOWN_ERROR",
      cause
    );
  }
}

export const aiErrorService = new AIErrorService();