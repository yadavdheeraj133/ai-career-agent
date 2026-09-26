import { AIProvider } from "./ai.provider.js";
import { AIRequest, AIResponse, AIUsage } from "../types/index.js";
import {
  AgentRouterConfig,
  AgentRouterConfigError,
  resolveAgentRouterConfig,
} from "../config/ai-config.js";
import { AIProviderError } from "./ai-provider.error.js";

interface AgentRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AgentRouterChoice {
  index: number;
  message?: AgentRouterMessage;
  finish_reason?: string | null;
}

interface AgentRouterErrorBody {
  message?: string;
  type?: string;
  code?: string | number;
}

interface AgentRouterPayload {
  id?: string;
  model?: string;
  choices?: AgentRouterChoice[];
  usage?: AIUsage & {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: AgentRouterErrorBody | string;
}

/**
 * ------------------------------------------------------------------
 * AgentRouter Provider
 * ------------------------------------------------------------------
 * Talks to AgentRouter over its OpenAI-compatible `/chat/completions` surface.
 *
 * Two properties of the gateway are load-bearing and are the reason this
 * provider is shaped the way it is:
 *
 * 1. AgentRouter only serves clients it recognises. A request without a
 *    recognised `User-Agent` is answered with HTTP 401
 *    `unauthorized_client_error` even when the API key is perfectly valid, so
 *    the identifying header is always sent.
 * 2. Every feature in this project consumes a Zod-validated JSON object, so
 *    requests ask for `response_format: { type: "json_object" }` rather than
 *    relying on the model to comply with "return only JSON" in the prompt.
 * ------------------------------------------------------------------
 */
export class AgentRouterProvider implements AIProvider {
  private readonly config: AgentRouterConfig;

  constructor(config: AgentRouterConfig = resolveAgentRouterConfig()) {
    this.config = config;
  }

  get endpoint(): string {
    return `${this.config.baseUrl}/chat/completions`;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const messages: AgentRouterMessage[] = [];

    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }

    messages.push({ role: "user", content: request.userPrompt });

    const jsonMode = request.jsonMode ?? this.config.jsonMode;

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      stream: false,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    if (this.config.disableThinking) {
      body.thinking = { type: "disabled" };
    }

    const raw = await this.post(body);

    let payload: AgentRouterPayload;
    try {
      payload = JSON.parse(raw) as AgentRouterPayload;
    } catch {
      throw new AIProviderError(
        "AI_MALFORMED_RESPONSE",
        `AgentRouter returned a non-JSON body (${raw.length} bytes) from ${this.endpoint}.`
      );
    }

    const embeddedError = this.readEmbeddedError(payload);
    if (embeddedError) {
      throw new AIProviderError(
        "AI_UPSTREAM_ERROR",
        `AgentRouter returned an error payload: ${embeddedError}`
      );
    }

    // An exhausted budget used to surface as "no content" or as an unparseable
    // body, which is indistinguishable from a model fault. It is its own
    // condition: the answer is incomplete, not wrong.
    this.assertNotTruncated(payload);

    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new AIProviderError(
        "AI_MALFORMED_RESPONSE",
        `AgentRouter returned HTTP 200 but no message content (model "${payload.model ?? this.config.model}").`
      );
    }

    return {
      content,
      model: payload.model ?? this.config.model,
      usage: this.readUsage(payload),
    };
  }

  /**
   * Detects a response that ran out of token budget. On this surface the reason
   * is reported as `length` by some upstreams and `max_tokens` by others.
   */
  private assertNotTruncated(payload: AgentRouterPayload): void {
    const choice = payload.choices?.[0];
    const finishReason = choice?.finish_reason;

    if (finishReason !== "length" && finishReason !== "max_tokens") return;

    const produced = payload.usage?.completion_tokens;

    throw new AIProviderError(
      "AI_TRUNCATED",
      `AgentRouter stopped at the ${this.config.maxTokens}-token budget before finishing the response` +
        (produced ? ` (used ${produced} completion tokens).` : ".") +
        ` Raise AGENT_ROUTER_MAX_TOKENS, or reduce the size of the request.`
    );
  }

  private async post(body: Record<string, unknown>): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          // Required. Without it the gateway answers 401 unauthorized_client_error.
          "User-Agent": this.config.userAgent,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new AIProviderError(
          "AI_TIMEOUT",
          `AgentRouter did not respond within ${this.config.timeoutMs}ms.`
        );
      }
      throw new AIProviderError(
        "AI_UPSTREAM_UNAVAILABLE",
        `Could not reach AgentRouter at ${this.endpoint}: ${describe(error)}`
      );
    } finally {
      clearTimeout(timer);
    }

    const raw = await response.text().catch(() => "");

    if (!response.ok) {
      throw AIProviderError.fromUpstreamStatus(
        response.status,
        `AgentRouter responded HTTP ${response.status} for model "${this.config.model}": ${extractUpstreamMessage(raw) || "(empty body)"}`
      );
    }

    return raw;
  }

  /**
   * Some gateways report failures inside an HTTP 200 body rather than as a
   * status code, so the payload is checked before the content is read.
   */
  private readEmbeddedError(payload: AgentRouterPayload): string | null {
    const error = payload.error;

    if (!error) return null;
    if (typeof error === "string") return error;
    return error.message ?? error.type ?? "unknown error";
  }

  private readUsage(payload: AgentRouterPayload): AIUsage | undefined {
    const usage = payload.usage;
    if (!usage) return undefined;

    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    };
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    const causeMessage =
      cause instanceof Error ? cause.message : undefined;
    return causeMessage ? `${error.message} (${causeMessage})` : error.message;
  }
  return String(error);
}

/**
 * Pulls the human-readable reason out of an error body without echoing an
 * entire page of HTML if a proxy answered instead of the gateway.
 */
function extractUpstreamMessage(raw: string): string {
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw) as {
      error?: AgentRouterErrorBody | string;
      message?: string;
    };

    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.error?.type) return parsed.error.type;
    if (parsed.message) return parsed.message;
  } catch {
    // Not JSON — fall through to the raw-text branch below.
  }

  return raw.slice(0, 200);
}

export { AgentRouterConfigError };
