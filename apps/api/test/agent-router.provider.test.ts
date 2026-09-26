/**
 * AgentRouter provider contract tests.
 *
 * The AI feature suites stub `fetch`, so they prove the request/response
 * handling but say nothing about whether the gateway will actually accept us.
 * These tests pin the wire contract itself: the exact URL, the headers the
 * gateway requires, the request body, and the classification of every failure
 * mode the environment can produce.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AgentRouterConfig,
  AgentRouterConfigError,
  DEFAULT_AGENT_ROUTER_MAX_TOKENS,
  DEFAULT_AGENT_ROUTER_USER_AGENT,
  normalizeAgentRouterBaseUrl,
  resolveAgentRouterConfig,
} from "../src/ai/config/ai-config.js";
import { AgentRouterProvider } from "../src/ai/providers/agent-router.provider.js";
import { AIProviderError } from "../src/ai/providers/ai-provider.error.js";
import {
  resetAIProvider,
  resolveAIProviderName,
  verifyAgentRouterConnection,
} from "../src/ai/providers/index.js";
import { responseParser } from "../src/ai/services/response-parser.service.js";

const CONFIG: AgentRouterConfig = {
  baseUrl: "https://gateway.test/v1",
  apiKey: "sk-test-key",
  model: "test-model",
  timeoutMs: 5_000,
  maxTokens: DEFAULT_AGENT_ROUTER_MAX_TOKENS,
  userAgent: DEFAULT_AGENT_ROUTER_USER_AGENT,
  jsonMode: true,
  disableThinking: true,
};

function completion(content: string, model = "test-model") {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-1",
      object: "chat.completion",
      model,
      choices: [
        { index: 0, message: { role: "assistant", content }, finish_reason: "stop" },
      ],
      usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

/** Reads back the most recent call the stubbed fetch received. */
function lastRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const calls = fetchMock.mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return {
    url,
    init,
    headers: init.headers as Record<string, string>,
    body: JSON.parse(init.body as string) as Record<string, unknown>,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => completion("ok"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetAIProvider();
  vi.restoreAllMocks();
});

describe("AgentRouter configuration", () => {
  it("reports the missing API key by name", () => {
    expect(() => resolveAgentRouterConfig({ AGENT_ROUTER_MODEL: "m" })).toThrow(
      /AGENT_ROUTER_API_KEY is not configured/
    );
  });

  it("reports the missing model by name", () => {
    expect(() => resolveAgentRouterConfig({ AGENT_ROUTER_API_KEY: "k" })).toThrow(
      /AGENT_ROUTER_MODEL is not configured/
    );
  });

  it("never includes credential material in a configuration error", () => {
    let message = "";
    try {
      resolveAgentRouterConfig({ AGENT_ROUTER_API_KEY: "  ", AGENT_ROUTER_MODEL: "m" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toMatch(/sk-/);
  });

  it("rejects a non-positive timeout instead of silently defaulting", () => {
    expect(() =>
      resolveAgentRouterConfig({
        AGENT_ROUTER_API_KEY: "k",
        AGENT_ROUTER_MODEL: "m",
        AGENT_ROUTER_TIMEOUT_MS: "0",
      })
    ).toThrow(AgentRouterConfigError);
  });

  it("strips quotes left behind by env files", () => {
    const config = resolveAgentRouterConfig({
      AGENT_ROUTER_API_KEY: '"sk-quoted"',
      AGENT_ROUTER_MODEL: "'quoted-model'",
    });
    expect(config.apiKey).toBe("sk-quoted");
    expect(config.model).toBe("quoted-model");
  });

  it("defaults to JSON mode and the documented user agent", () => {
    const config = resolveAgentRouterConfig({
      AGENT_ROUTER_API_KEY: "k",
      AGENT_ROUTER_MODEL: "m",
    });
    expect(config.jsonMode).toBe(true);
    expect(config.userAgent).toBe(DEFAULT_AGENT_ROUTER_USER_AGENT);
    expect(config.baseUrl).toBe("https://agentrouter.org/v1");
  });

  it("honours an explicit JSON-mode opt-out", () => {
    const config = resolveAgentRouterConfig({
      AGENT_ROUTER_API_KEY: "k",
      AGENT_ROUTER_MODEL: "m",
      AGENT_ROUTER_JSON_MODE: "false",
    });
    expect(config.jsonMode).toBe(false);
  });
});

describe("base URL normalization", () => {
  it("keeps a base URL that already carries the version segment", () => {
    expect(normalizeAgentRouterBaseUrl("https://gateway.test/v1")).toBe(
      "https://gateway.test/v1"
    );
  });

  it("removes trailing slashes instead of producing a double slash", () => {
    expect(normalizeAgentRouterBaseUrl("https://gateway.test/v1/")).toBe(
      "https://gateway.test/v1"
    );
  });

  it("adds the version segment when the host is given bare", () => {
    expect(normalizeAgentRouterBaseUrl("https://gateway.test")).toBe(
      "https://gateway.test/v1"
    );
  });

  it("discards query strings and fragments", () => {
    expect(normalizeAgentRouterBaseUrl("https://gateway.test/v1?a=1#f")).toBe(
      "https://gateway.test/v1"
    );
  });

  it("rejects a value that is not an absolute URL", () => {
    expect(() => normalizeAgentRouterBaseUrl("gateway.test/v1")).toThrow(
      /absolute http\(s\) URL/
    );
  });

  it("rejects a non-http protocol", () => {
    expect(() => normalizeAgentRouterBaseUrl("ftp://gateway.test/v1")).toThrow(
      /http or https/
    );
  });
});

describe("AgentRouterProvider request", () => {
  it("sends a successful request and returns the generated text", async () => {
    fetchMock.mockResolvedValue(completion("the answer", "served-model"));

    const result = await new AgentRouterProvider(CONFIG).generate({
      userPrompt: "hi",
    });

    expect(result.content).toBe("the answer");
    expect(result.model).toBe("served-model");
    expect(result.usage).toEqual({
      promptTokens: 7,
      completionTokens: 3,
      totalTokens: 10,
    });
  });

  it("targets the chat/completions endpoint on the normalized base URL", async () => {
    await new AgentRouterProvider(CONFIG).generate({ userPrompt: "hi" });

    expect(lastRequest(fetchMock).url).toBe(
      "https://gateway.test/v1/chat/completions"
    );
  });

  // This is the failure that made AgentRouter unusable: the gateway answers
  // 401 unauthorized_client_error for a request it does not recognise, even
  // when the API key is valid.
  it("identifies the client with a User-Agent header", async () => {
    await new AgentRouterProvider(CONFIG).generate({ userPrompt: "hi" });

    const { headers } = lastRequest(fetchMock);
    expect(headers["User-Agent"]).toBeTruthy();
    expect(headers["User-Agent"]).toBe(DEFAULT_AGENT_ROUTER_USER_AGENT);
  });

  it("authenticates with a bearer token", async () => {
    await new AgentRouterProvider(CONFIG).generate({ userPrompt: "hi" });

    expect(lastRequest(fetchMock).headers.Authorization).toBe(
      "Bearer sk-test-key"
    );
  });

  it("sends the system prompt as a system message", async () => {
    await new AgentRouterProvider(CONFIG).generate({
      systemPrompt: "be terse",
      userPrompt: "hi",
    });

    expect(lastRequest(fetchMock).body.messages).toEqual([
      { role: "system", content: "be terse" },
      { role: "user", content: "hi" },
    ]);
  });

  it("requests a JSON object by default", async () => {
    await new AgentRouterProvider(CONFIG).generate({ userPrompt: "hi" });

    expect(lastRequest(fetchMock).body.response_format).toEqual({
      type: "json_object",
    });
  });

  it("omits the JSON response format when the caller asks for plain text", async () => {
    await new AgentRouterProvider(CONFIG).generate({
      userPrompt: "hi",
      jsonMode: false,
    });

    expect(lastRequest(fetchMock).body.response_format).toBeUndefined();
  });

  it("never requests a stream", async () => {
    await new AgentRouterProvider(CONFIG).generate({ userPrompt: "hi" });

    expect(lastRequest(fetchMock).body.stream).toBe(false);
  });

  it("uses the configured token budget and honours a per-request override", async () => {
    const provider = new AgentRouterProvider(CONFIG);

    await provider.generate({ userPrompt: "hi" });
    expect(lastRequest(fetchMock).body.max_tokens).toBe(CONFIG.maxTokens);

    await provider.generate({ userPrompt: "hi", maxTokens: 128 });
    expect(lastRequest(fetchMock).body.max_tokens).toBe(128);
  });

  // Reasoning tokens are drawn from the same budget as the answer, so an
  // unconstrained trace is what made large responses run out mid-JSON.
  it("suppresses the reasoning trace by default", async () => {
    await new AgentRouterProvider(CONFIG).generate({ userPrompt: "hi" });

    expect(lastRequest(fetchMock).body.thinking).toEqual({ type: "disabled" });
  });

  it("omits the thinking directive when reasoning is enabled", async () => {
    await new AgentRouterProvider({ ...CONFIG, disableThinking: false }).generate(
      { userPrompt: "hi" }
    );

    expect(lastRequest(fetchMock).body.thinking).toBeUndefined();
  });

  it("defaults to a token budget large enough for the heaviest prompt", () => {
    expect(DEFAULT_AGENT_ROUTER_MAX_TOKENS).toBe(16384);
  });

  it("defaults reasoning suppression on and allows opting out", () => {
    const on = resolveAgentRouterConfig({
      AGENT_ROUTER_API_KEY: "k",
      AGENT_ROUTER_MODEL: "m",
    });
    const off = resolveAgentRouterConfig({
      AGENT_ROUTER_API_KEY: "k",
      AGENT_ROUTER_MODEL: "m",
      AGENT_ROUTER_DISABLE_THINKING: "false",
    });

    expect(on.disableThinking).toBe(true);
    expect(off.disableThinking).toBe(false);
  });
});

describe("truncated responses", () => {
  const truncated = (finishReason: string) =>
    new Response(
      JSON.stringify({
        model: "test-model",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: '{"overview":"trunc' },
            finish_reason: finishReason,
          },
        ],
        usage: { completion_tokens: 8192 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  // An exhausted budget used to be reported as an unparseable body, which is
  // indistinguishable from the model returning nonsense.
  it.each(["length", "max_tokens"])(
    "reports finish_reason=%s as a truncation, not a parse failure",
    async (finishReason) => {
      fetchMock.mockResolvedValue(truncated(finishReason));

      const error = (await new AgentRouterProvider(CONFIG)
        .generate({ userPrompt: "hi" })
        .catch((e: unknown) => e)) as AIProviderError;

      expect(error.code).toBe("AI_TRUNCATED");
      expect(error.message).toContain("AGENT_ROUTER_MAX_TOKENS");
    }
  );

  it("does not treat a normally finished response as truncated", async () => {
    fetchMock.mockResolvedValue(completion("done"));

    const result = await new AgentRouterProvider(CONFIG).generate({
      userPrompt: "hi",
    });

    expect(result.content).toBe("done");
  });
});

describe("AgentRouterProvider failure handling", () => {
  it("classifies a rejected API key without leaking it", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "invalid token" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    );

    const error = await new AgentRouterProvider(CONFIG)
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AIProviderError);
    const providerError = error as AIProviderError;
    expect(providerError.code).toBe("AI_UNAUTHORIZED");
    expect(providerError.upstreamStatus).toBe(401);
    expect(providerError.httpStatus).toBe(502);
    expect(providerError.clientMessage).not.toMatch(/sk-test-key/);
    expect(providerError.message).toContain("invalid token");
  });

  it("classifies an unknown model", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "no channel for model" } }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    );

    const error = (await new AgentRouterProvider(CONFIG)
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e)) as AIProviderError;

    expect(error.code).toBe("AI_UPSTREAM_UNAVAILABLE");
    expect(error.upstreamStatus).toBe(503);
  });

  it("classifies a wrong base URL as not found", async () => {
    fetchMock.mockResolvedValue(new Response("not found", { status: 404 }));

    const error = (await new AgentRouterProvider(CONFIG)
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e)) as AIProviderError;

    expect(error.code).toBe("AI_NOT_FOUND");
  });

  it("classifies a rate limit as retryable", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 429 }));

    const error = (await new AgentRouterProvider(CONFIG)
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e)) as AIProviderError;

    expect(error.code).toBe("AI_RATE_LIMITED");
    expect(error.httpStatus).toBe(503);
  });

  it("classifies a timeout", async () => {
    fetchMock.mockImplementation(
      (_url: unknown, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        })
    );

    const error = (await new AgentRouterProvider({ ...CONFIG, timeoutMs: 20 })
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e)) as AIProviderError;

    expect(error.code).toBe("AI_TIMEOUT");
    expect(error.httpStatus).toBe(504);
  });

  it("classifies an unreachable host", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const error = (await new AgentRouterProvider(CONFIG)
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e)) as AIProviderError;

    expect(error.code).toBe("AI_UPSTREAM_UNAVAILABLE");
  });

  it("classifies a non-JSON body", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>gateway</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    const error = (await new AgentRouterProvider(CONFIG)
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e)) as AIProviderError;

    expect(error.code).toBe("AI_MALFORMED_RESPONSE");
  });

  it("classifies a 200 with no content", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ index: 0, message: {} }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const error = (await new AgentRouterProvider(CONFIG)
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e)) as AIProviderError;

    expect(error.code).toBe("AI_MALFORMED_RESPONSE");
  });

  it("classifies an error delivered inside a 200 body", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "quota exceeded" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const error = (await new AgentRouterProvider(CONFIG)
      .generate({ userPrompt: "hi" })
      .catch((e: unknown) => e)) as AIProviderError;

    expect(error.code).toBe("AI_UPSTREAM_ERROR");
    expect(error.message).toContain("quota exceeded");
  });

  it("does not fall back to another provider when the gateway fails", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));

    await expect(
      new AgentRouterProvider(CONFIG).generate({ userPrompt: "hi" })
    ).rejects.toBeInstanceOf(AIProviderError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("provider selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetAIProvider();
  });

  it("resolves agent-router when configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AI_PROVIDER", "agent-router");
    expect(resolveAIProviderName()).toBe("agent-router");
  });

  it("refuses to run on mock output in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_PROVIDER", "mock");

    expect(() => resolveAIProviderName()).toThrow(/must be "agent-router"/);
  });

  it("rejects an unknown provider name", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AI_PROVIDER", "openai");

    expect(() => resolveAIProviderName()).toThrow(/Unsupported AI_PROVIDER/);
  });
});

describe("connection check", () => {
  it("returns the real generated text and the serving model", async () => {
    fetchMock.mockResolvedValue(completion(" AGENTROUTER_OK ", "test-model"));

    const result = await verifyAgentRouterConnection(CONFIG);

    expect(result.content).toBe("AGENTROUTER_OK");
    expect(result.model).toBe("test-model");
  });

  it("asks for plain text so the probe can compare the reply verbatim", async () => {
    await verifyAgentRouterConnection(CONFIG);

    expect(lastRequest(fetchMock).body.response_format).toBeUndefined();
    expect(lastRequest(fetchMock).body.temperature).toBe(0);
  });
});

describe("response parsing", () => {
  it("parses a bare JSON object", () => {
    expect(responseParser.parse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses a fenced block", () => {
    expect(
      responseParser.parse<{ a: number }>('```json\n{"a":1}\n```')
    ).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in prose", () => {
    expect(
      responseParser.parse<{ a: number }>('Here you go:\n{"a":1}\nHope that helps!')
    ).toEqual({ a: 1 });
  });

  it("parses a fenced block surrounded by prose", () => {
    expect(
      responseParser.parse<{ a: number }>(
        'Sure thing.\n\n```json\n{"a":1}\n```\n\nLet me know.'
      )
    ).toEqual({ a: 1 });
  });

  it("raises a classified error when no JSON is present", () => {
    const error = (() => {
      try {
        responseParser.parse("not json at all");
        return null;
      } catch (e) {
        return e as AIProviderError;
      }
    })();

    expect(error).toBeInstanceOf(AIProviderError);
    expect((error as AIProviderError).code).toBe("AI_INVALID_RESPONSE");
  });
});
