/**
 * Retry / failure handling for background automation.
 *
 * Distinguishes transient failures (network blips, timeouts, provider 5xx/429)
 * from permanent ones (validation, provider 4xx) so the worker never spins on
 * an input that can never succeed.
 */

export class TransientError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TransientError";
  }
}

export class PermanentError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PermanentError";
  }
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const TRANSIENT_PATTERNS =
  /(econnreset|econnrefused|etimedout|enotfound|eai_again|socket hang up|network|fetch failed|aborted|timeout)/i;

export function classifyError(error: unknown): "transient" | "permanent" {
  if (error instanceof PermanentError) return "permanent";
  if (error instanceof TransientError) return "transient";

  if (error instanceof HttpError) {
    if (error.status === 429 || error.status >= 500) return "transient";
    return "permanent";
  }

  if (error instanceof Error) {
    if (TRANSIENT_PATTERNS.test(error.message)) return "transient";
    // Zod / validation failures are permanent: retrying cannot fix bad input.
    if (error.name === "ZodError") return "permanent";
  }

  return "permanent";
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (info: {
    attempt: number;
    error: unknown;
    delayMs: number;
  }) => void;
  /** Injectable for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 5_000;

/** Exponential backoff capped at `maxDelayMs`; attempt 1 is the first try. */
export function backoffDelay(
  attempt: number,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS
): number {
  const exponential = baseDelayMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(exponential, maxDelayMs);
}

/**
 * Runs `operation`, retrying only transient failures. The number of attempts is
 * always finite, so a permanently failing provider cannot create a retry loop.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const isRetryable = options.isRetryable ?? ((error) => classifyError(error) === "transient");
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const canRetry = attempt < attempts && isRetryable(error);
      if (!canRetry) {
        throw error;
      }

      const delayMs = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      options.onRetry?.({ attempt, error, delayMs });
      await sleep(delayMs);
    }
  }

  throw lastError;
}
