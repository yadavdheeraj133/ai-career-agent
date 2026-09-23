import "dotenv/config";

import { AIProvider } from "./ai.provider.js";
import { AIRequest, AIResponse } from "../types/index.js";

interface AgentRouterMessage {
  role: string;
  content?: string;
}

interface AgentRouterChoice {
  index: number;
  message?: AgentRouterMessage;
  finish_reason?: string;
}

interface AgentRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface AgentRouterResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: AgentRouterChoice[];
  usage?: AgentRouterUsage;
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

export class AgentRouterProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    const stripQuotes = (value: string | undefined): string => {
      if (!value) return "";
      return value.trim().replace(/^["'](.+)["']$/, "$1").trim();
    };

    this.baseUrl = stripQuotes(process.env.AGENT_ROUTER_BASE_URL);

    this.apiKey = stripQuotes(process.env.AGENT_ROUTER_API_KEY);

    this.model = stripQuotes(process.env.AGENT_ROUTER_MODEL);

    this.timeoutMs = Number.parseInt(
      process.env.AGENT_ROUTER_TIMEOUT_MS ?? "300000",
      10,
    );

    if (!this.baseUrl) {
      throw new Error(
        "AGENT_ROUTER_BASE_URL is not configured.",
      );
    }

    if (!this.apiKey) {
      throw new Error(
        "AGENT_ROUTER_API_KEY is not configured.",
      );
    }

    if (!this.model) {
      throw new Error(
        "AGENT_ROUTER_MODEL is not configured.",
      );
    }

    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      this.timeoutMs = 300000;
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    console.log("\n==============================");
    console.log("🚀 AGENT ROUTER REQUEST");
    console.log("==============================");
    console.log("Model:", this.model);
    console.log("Base URL:", this.baseUrl);
    console.log(
      "System Prompt Length:",
      request.systemPrompt?.length ?? 0,
    );
    console.log(
      "User Prompt Length:",
      request.userPrompt.length,
    );

    console.time("AgentRouter Generation");

    try {
      const messages: AgentRouterMessage[] = [];

      if (request.systemPrompt) {
        messages.push({
          role: "system",
          content: request.systemPrompt,
        });
      }

      messages.push({
        role: "user",
        content: request.userPrompt,
      });

      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: request.temperature ?? 0.2,
            max_tokens: request.maxTokens ?? 2048,
            stream: false,
          }),
        },
      );

      const raw = await response.text();

      console.log("\n======================================");
      console.log("RAW RESPONSE FROM AGENT ROUTER");
      console.log("======================================");
      console.log(raw);

      let data: AgentRouterResponse;

      try {
        data = JSON.parse(raw) as AgentRouterResponse;
      } catch {
        throw new Error(
          `AgentRouter returned invalid JSON.\n\n${raw}`,
        );
      }

      console.log("\n======================================");
      console.log("PARSED RESPONSE");
      console.log("======================================");
      console.dir(data, { depth: null });

      if (!response.ok) {
        const errorMessage =
          data.error?.message ??
          `AgentRouter request failed with status ${response.status}.`;

        throw new Error(errorMessage);
      }

      if (data.error) {
        throw new Error(
          data.error.message ??
            "AgentRouter returned an unknown error.",
        );
      }

      const content =
        data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error(
          `AgentRouter response content is empty.\n\n${JSON.stringify(
            data,
            null,
            2,
          )}`,
        );
      }

      return {
        content,
        model: data.model ?? this.model,
      };
    } catch (error) {
      console.timeEnd("AgentRouter Generation");

      console.error("\n==============================");
      console.error("❌ AGENT ROUTER ERROR");
      console.error("==============================");
      console.error(error);

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        throw new Error(
          `AgentRouter request timed out after ${this.timeoutMs}ms.`,
        );
      }

      if (error instanceof Error) {
        throw new Error(
          `Failed to communicate with AgentRouter: ${error.message}`,
        );
      }

      throw new Error(
        "Unknown error while communicating with AgentRouter.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}