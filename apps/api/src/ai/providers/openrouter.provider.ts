// import { AIProvider, AIRequest, AIResponse } from "./ai.provider.js";

// interface OpenRouterMessage {
//   role: "system" | "user" | "assistant";
//   content: string;
// }

// interface OpenRouterResponse {
//   id: string;
//   model: string;
//   choices: {
//     message: {
//       role: string;
//       content: string;
//     };
//     finish_reason: string;
//   }[];
// }

// export class OpenRouterProvider implements AIProvider {
//   private readonly baseUrl: string;
//   private readonly apiKey: string;
//   private readonly model: string;

//   constructor() {
//     this.baseUrl = process.env.OPENROUTER_BASE_URL!;
//     this.apiKey = process.env.OPENROUTER_API_KEY!;
//     this.model = process.env.OPENROUTER_MODEL!;

//     if (!this.baseUrl) {
//       throw new Error("OPENROUTER_BASE_URL is not configured.");
//     }

//     if (!this.apiKey) {
//       throw new Error("OPENROUTER_API_KEY is not configured.");
//     }

//     if (!this.model) {
//       throw new Error("OPENROUTER_MODEL is not configured.");
//     }
//   }

//   async generate(request: AIRequest): Promise<AIResponse> {
//     const controller = new AbortController();

//     const timeout = setTimeout(() => {
//       controller.abort();
//     }, 60000);

//     try {
//       const messages: OpenRouterMessage[] = [];

//       if (request.systemPrompt) {
//         messages.push({
//           role: "system",
//           content: request.systemPrompt,
//         });
//       }

//       messages.push({
//         role: "user",
//         content: request.userPrompt,
//       });

//       const response = await fetch(
//         `${this.baseUrl}/chat/completions`,
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${this.apiKey}`,
//             "Content-Type": "application/json",
//           },
//           signal: controller.signal,
//           body: JSON.stringify({
//             model: this.model,
//             messages,
//             temperature: request.temperature ?? 0.2,
//             max_tokens: request.maxTokens ?? 1024,
//           }),
//         }
//       );

//       if (!response.ok) {
//         throw new Error(
//           `OpenRouter request failed with status ${response.status}.`
//         );
//       }

//       const data = (await response.json()) as OpenRouterResponse;

//       const content = data.choices?.[0]?.message?.content;

//       if (!content) {
//         throw new Error("Invalid response received from OpenRouter.");
//       }

//       return {
//         content: content.trim(),
//         model: data.model,
//       };
//     } catch (error) {
//       if (error instanceof Error && error.name === "AbortError") {
//         throw new Error("OpenRouter request timed out.");
//       }

//       if (error instanceof Error) {
//         throw new Error(
//           `Failed to communicate with OpenRouter: ${error.message}`
//         );
//       }

//       throw new Error("Unknown error while communicating with OpenRouter.");
//     } finally {
//       clearTimeout(timeout);
//     }
//   }
// }