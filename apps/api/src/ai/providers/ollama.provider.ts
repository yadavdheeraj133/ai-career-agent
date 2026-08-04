import "dotenv/config";

import { AIProvider } from "./ai.provider.js";
import { AIRequest, AIResponse } from "../types/index.js";

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response?: string;
  thinking?: string;
  done: boolean;
  done_reason?: string;
  error?: string;
}

interface OllamaModelInfo {
  name: string;
}

interface OllamaTagsResponse {
  models?: OllamaModelInfo[];
}

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL?.trim() ?? "";
    this.model = process.env.OLLAMA_MODEL?.trim() ?? "";
    this.timeoutMs = Number.parseInt(
      process.env.OLLAMA_TIMEOUT_MS ?? "300000",
      10,
    );

    if (!this.baseUrl) {
      throw new Error("OLLAMA_BASE_URL is not configured.");
    }

    if (!this.model) {
      throw new Error("OLLAMA_MODEL is not configured.");
    }

    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      this.timeoutMs = 300000;
    }
  }

  private async ensureModelAvailable(signal: AbortSignal): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Ollama server check failed with status ${response.status}.`,
        );
      }

      const payload = (await response.json()) as OllamaTagsResponse;
      const modelNames = payload.models?.map((m) => m.name) ?? [];
      const hasModel = modelNames.some(
        (name) => name === this.model || name.startsWith(`${this.model}:`),
      );

      if (!hasModel) {
        throw new Error(
          `Ollama model "${this.model}" is not available. Run: ollama pull ${this.model}`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Ollama server check timed out after ${this.timeoutMs}ms.`,
        );
      }

      if (error instanceof Error) {
        throw new Error(
          `Unable to reach Ollama at ${this.baseUrl}. ${error.message}`,
        );
      }

      throw new Error(`Unable to reach Ollama at ${this.baseUrl}.`);
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    console.log("\n==============================");
    console.log("🚀 OLLAMA REQUEST");
    console.log("==============================");
    console.log("Model:", this.model);
    console.log("Base URL:", this.baseUrl);
    console.log("System Prompt Length:", request.systemPrompt?.length ?? 0);
    console.log("User Prompt Length:", request.userPrompt.length);

    console.time("Ollama Generation");

    try {
      await this.ensureModelAvailable(controller.signal);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          system: request.systemPrompt,

          prompt: `/no_think

            ${request.userPrompt}`,

          stream: false,

          options: {
            temperature: request.temperature ?? 0.2,
            num_predict: request.maxTokens ?? 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama request failed with status ${response.status}.`,
        );
      }

      const raw = await response.text();

      console.log("\n======================================");
      console.log("RAW RESPONSE FROM OLLAMA");
      console.log("======================================");
      console.log(raw);

      let data: OllamaGenerateResponse;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Ollama returned invalid JSON.\n\n${raw}`);
      }

      console.log("\n======================================");
      console.log("PARSED RESPONSE");
      console.log("======================================");
      console.dir(data, { depth: null });

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.response) {
        throw new Error(
          `Response field is empty.\n\n${JSON.stringify(data, null, 2)}`,
        );
      }

      return {
        content: data.response.trim(),
        model: data.model,
      };
    } catch (error) {
      console.timeEnd("Ollama Generation");

      console.error("\n==============================");
      console.error("❌ OLLAMA ERROR");
      console.error("==============================");
      console.error(error);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Ollama request timed out after ${this.timeoutMs}ms.`);
      }

      if (error instanceof Error) {
        throw new Error(`Failed to communicate with Ollama: ${error.message}`);
      }

      throw new Error("Unknown error while communicating with Ollama.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
