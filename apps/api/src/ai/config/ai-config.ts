/**
 * ------------------------------------------------------------------
 * AI Configuration
 * ------------------------------------------------------------------
 * Single source of truth for every AI-related environment variable.
 *
 * The provider used to read `process.env` on its own, which meant a missing
 * variable only surfaced as a generic 500 from whichever route happened to call
 * the model first. Resolving and validating the whole configuration in one
 * place makes misconfiguration a named, actionable error instead.
 * ------------------------------------------------------------------
 */

export type AIProviderName = "agent-router" | "mock";

/**
 * AgentRouter is an OpenAI-compatible gateway that only accepts requests from a
 * client it recognises. It answers anything else with HTTP 401
 * `unauthorized_client_error`, regardless of how valid the API key is, so the
 * identifying header is part of the wire contract and not a cosmetic choice.
 */
export const DEFAULT_AGENT_ROUTER_BASE_URL = "https://agentrouter.org/v1";

export const DEFAULT_AGENT_ROUTER_USER_AGENT =
  "AI-Career-Agent/1.0";

export const DEFAULT_AGENT_ROUTER_TIMEOUT_MS = 300_000;

/**
 * The routed models are reasoning models, and on this OpenAI-compatible surface
 * reasoning tokens are drawn from the same `max_tokens` budget as the answer.
 * A large response — interview preparation, a career roadmap — therefore ran out
 * of budget mid-JSON and came back truncated. 16384 is the smallest budget
 * verified to complete the heaviest prompt in this project with headroom to
 * spare.
 */
export const DEFAULT_AGENT_ROUTER_MAX_TOKENS = 16384;

export interface AgentRouterConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
  userAgent: string;
  jsonMode: boolean;
  /**
   * Ask the model not to emit a reasoning trace.
   *
   * Every feature here consumes a JSON object, so reasoning is pure overhead:
   * suppressing it cut a representative response from 13917 to 3143 completion
   * tokens for identical output, which is what makes the larger `max_tokens`
   * affordable. Turn it off with AGENT_ROUTER_DISABLE_THINKING=false if a model
   * needs it.
   */
  disableThinking: boolean;
}

/**
 * Raised when AgentRouter cannot be configured at all. Carries no secret
 * material, only the names of the variables that are missing or malformed.
 */
export class AgentRouterConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentRouterConfigError";
  }
}

type EnvLike = Record<string, string | undefined>;

/**
 * Env files and CI secrets are routinely written with the value wrapped in
 * quotes; dotenv keeps those quotes, so they have to come off before use.
 */
function unquote(value: string | undefined): string {
  if (value === undefined) return "";
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' || first === "'") && first === last) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function readPositiveInt(
  value: string | undefined,
  fallback: number,
  variableName: string
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AgentRouterConfigError(
      `${variableName} must be a positive integer (got "${value}"). Omit it to use the default of ${fallback}.`
    );
  }
  return parsed;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

/**
 * Turns a configured base URL into the exact prefix that precedes
 * `/chat/completions`.
 *
 * Two mistakes are corrected here because both otherwise surface as an opaque
 * 404 from the gateway: a trailing slash (`https://host/v1/` produced
 * `/v1//chat/completions`) and a missing version segment (`https://host`
 * produced `/chat/completions`, which the gateway does not serve).
 */
export function normalizeAgentRouterBaseUrl(raw: string): string {
  const candidate = unquote(raw);
  if (!candidate) {
    throw new AgentRouterConfigError("AGENT_ROUTER_BASE_URL is empty.");
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new AgentRouterConfigError(
      `AGENT_ROUTER_BASE_URL must be an absolute http(s) URL (got "${candidate}"). Example: ${DEFAULT_AGENT_ROUTER_BASE_URL}`
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AgentRouterConfigError(
      `AGENT_ROUTER_BASE_URL must use http or https (got "${url.protocol}").`
    );
  }

  // Query strings and fragments are never part of an API base URL; dropping
  // them keeps the joined endpoint well-formed.
  url.search = "";
  url.hash = "";

  let path = url.pathname.replace(/\/+$/, "");
  if (path === "" || path === "/") {
    path = "/v1";
  }

  return `${url.origin}${path}`;
}

/**
 * Resolves the AgentRouter settings, or explains precisely which variable is
 * missing. Secrets are never included in the thrown message.
 */
export function resolveAgentRouterConfig(env: EnvLike = process.env): AgentRouterConfig {
  const apiKey = unquote(env.AGENT_ROUTER_API_KEY);
  const model = unquote(env.AGENT_ROUTER_MODEL);

  if (!apiKey) {
    throw new AgentRouterConfigError(
      "AGENT_ROUTER_API_KEY is not configured. Set it in apps/api/.env to the AgentRouter API key issued by your AgentRouter account."
    );
  }

  if (!model) {
    throw new AgentRouterConfigError(
      "AGENT_ROUTER_MODEL is not configured. Set it in apps/api/.env to a model your AgentRouter account can route, for example \"deepseek-v4-flash\"."
    );
  }

  return {
    baseUrl: normalizeAgentRouterBaseUrl(
      unquote(env.AGENT_ROUTER_BASE_URL) || DEFAULT_AGENT_ROUTER_BASE_URL
    ),
    apiKey,
    model,
    timeoutMs: readPositiveInt(
      env.AGENT_ROUTER_TIMEOUT_MS,
      DEFAULT_AGENT_ROUTER_TIMEOUT_MS,
      "AGENT_ROUTER_TIMEOUT_MS"
    ),
    maxTokens: readPositiveInt(
      env.AGENT_ROUTER_MAX_TOKENS,
      DEFAULT_AGENT_ROUTER_MAX_TOKENS,
      "AGENT_ROUTER_MAX_TOKENS"
    ),
    userAgent:
      unquote(env.AGENT_ROUTER_USER_AGENT) || DEFAULT_AGENT_ROUTER_USER_AGENT,
    jsonMode: readBoolean(env.AGENT_ROUTER_JSON_MODE, true),
    disableThinking: readBoolean(env.AGENT_ROUTER_DISABLE_THINKING, true),
  };
}

/** A description of the configured provider, safe to log and to serve. */
export function describeAgentRouterConfig(
  config: AgentRouterConfig
): Record<string, string | number | boolean> {
  return {
    baseUrl: config.baseUrl,
    model: config.model,
    timeoutMs: config.timeoutMs,
    maxTokens: config.maxTokens,
    userAgent: config.userAgent,
    jsonMode: config.jsonMode,
    disableThinking: config.disableThinking,
    apiKey: `${config.apiKey.slice(0, 3)}***${config.apiKey.slice(-2)} (${config.apiKey.length} chars)`,
  };
}
