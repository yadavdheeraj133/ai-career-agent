/**
 * AI boundary mock.
 *
 * The LLM is the one genuinely external dependency of this API, so it is the
 * only thing stubbed. Everything downstream of it still runs for real:
 * prompt building, the AgentRouter provider's request/response handling, the
 * markdown-fence stripping in ResponseParserService, and the Zod response
 * schema validation in the AI domain services.
 *
 * The provider calls bare `fetch`, so replacing the global is sufficient to
 * intercept it without touching application code.
 */
import { vi } from "vitest";

type MockMode =
  | { kind: "success"; content: string }
  | { kind: "http-error"; status: number; message: string };

let mode: MockMode = { kind: "success", content: "{}" };
let calls = 0;

/** Queue a raw string as the model's reply (used for malformed-output tests). */
export function setAIRawContent(content: string): void {
  mode = { kind: "success", content };
}

/** Queue a schema-shaped object as the model's reply. */
export function setAIResponse(fixture: unknown): void {
  setAIRawContent(JSON.stringify(fixture));
}

/** Make the upstream call fail, to exercise the 500 path. */
export function setAIFailure(
  message = "upstream model unavailable",
  status = 500
): void {
  mode = { kind: "http-error", status, message };
}

/** How many times the model was called — used to assert validation short-circuits. */
export function aiCallCount(): number {
  return calls;
}

export function installAiMock(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      calls += 1;

      if (mode.kind === "http-error") {
        return new Response(
          JSON.stringify({ error: { message: mode.message, type: "test" } }),
          {
            status: mode.status,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Shape mirrors an OpenAI-compatible /chat/completions response, which is
      // what AgentRouterProvider parses.
      return new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 0,
          model: "test-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: mode.content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    })
  );
}

export function resetAiMock(): void {
  mode = { kind: "success", content: "{}" };
  calls = 0;
  vi.unstubAllGlobals();
}
