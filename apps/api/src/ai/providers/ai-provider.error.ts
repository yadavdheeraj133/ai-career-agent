/**
 * ------------------------------------------------------------------
 * AI Provider Error
 * ------------------------------------------------------------------
 * A transport-level failure talking to the AI provider.
 *
 * Previously every failure — a rejected API key, a wrong base URL, an unknown
 * model, a timeout — was re-wrapped into one anonymous `Error`, and the error
 * middleware then replaced the message with "Internal Server Error". Nothing
 * could tell a misconfiguration apart from an outage, and the upstream status
 * was discarded. This type keeps the status and a redacted reason so the
 * boundary can map it to a correct HTTP response.
 * ------------------------------------------------------------------
 */

export type AIErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_TIMEOUT"
  | "AI_UNAUTHORIZED"
  | "AI_NOT_FOUND"
  | "AI_RATE_LIMITED"
  | "AI_UPSTREAM_UNAVAILABLE"
  | "AI_UPSTREAM_ERROR"
  | "AI_TRUNCATED"
  | "AI_MALFORMED_RESPONSE"
  | "AI_INVALID_RESPONSE"
  | "AI_UNKNOWN_ERROR";

const STATUS_TO_CODE: Record<number, AIErrorCode> = {
  400: "AI_UPSTREAM_ERROR",
  401: "AI_UNAUTHORIZED",
  402: "AI_UPSTREAM_UNAVAILABLE",
  403: "AI_UNAUTHORIZED",
  404: "AI_NOT_FOUND",
  408: "AI_TIMEOUT",
  429: "AI_RATE_LIMITED",
};

const CODE_TO_STATUS: Record<AIErrorCode, number> = {
  AI_NOT_CONFIGURED: 503,
  AI_TIMEOUT: 504,
  AI_UNAUTHORIZED: 502,
  AI_NOT_FOUND: 502,
  AI_RATE_LIMITED: 503,
  AI_UPSTREAM_UNAVAILABLE: 503,
  AI_UPSTREAM_ERROR: 502,
  AI_TRUNCATED: 502,
  AI_MALFORMED_RESPONSE: 502,
  AI_INVALID_RESPONSE: 502,
  AI_UNKNOWN_ERROR: 500,
};

const CLIENT_MESSAGE: Record<AIErrorCode, string> = {
  AI_NOT_CONFIGURED:
    "The AI service is not configured on the server. Please contact support.",
  AI_TIMEOUT: "The AI service took too long to respond. Please try again.",
  AI_UNAUTHORIZED:
    "The AI service rejected the server's credentials. Please contact support.",
  AI_NOT_FOUND:
    "The AI service could not find the requested model or endpoint. Please contact support.",
  AI_RATE_LIMITED:
    "The AI service is busy right now. Please try again in a moment.",
  AI_UPSTREAM_UNAVAILABLE:
    "The AI service is unavailable right now. Please try again later.",
  AI_UPSTREAM_ERROR:
    "The AI service returned an error. Please try again later.",
  AI_TRUNCATED:
    "The AI response was too long to complete. Please try again.",
  AI_MALFORMED_RESPONSE:
    "The AI service returned an unreadable response. Please try again.",
  AI_INVALID_RESPONSE:
    "The AI service returned a response that could not be used. Please try again.",
  AI_UNKNOWN_ERROR: "Internal Server Error",
};

export class AIProviderError extends Error {
  readonly code: AIErrorCode;

  /** Upstream HTTP status, when the failure came back as a response. */
  readonly upstreamStatus?: number;

  constructor(
    code: AIErrorCode,
    /** Server-side diagnostic. Never returned to the client verbatim. */
    detail: string,
    upstreamStatus?: number
  ) {
    super(detail);
    this.name = "AIProviderError";
    this.code = code;
    this.upstreamStatus = upstreamStatus;
  }

  /** HTTP status this boundary failure should be reported as. */
  get httpStatus(): number {
    return CODE_TO_STATUS[this.code];
  }

  /**
   * Message for the API client. Deliberately generic so that base URLs, model
   * names and upstream internals are not disclosed, and never includes
   * credentials.
   */
  get clientMessage(): string {
    return CLIENT_MESSAGE[this.code];
  }

  static fromUpstreamStatus(status: number, detail: string): AIProviderError {
    const code =
      STATUS_TO_CODE[status] ??
      (status >= 500 ? "AI_UPSTREAM_UNAVAILABLE" : "AI_UPSTREAM_ERROR");
    return new AIProviderError(code, detail, status);
  }
}

export function isAIProviderError(error: unknown): error is AIProviderError {
  return error instanceof AIProviderError;
}
