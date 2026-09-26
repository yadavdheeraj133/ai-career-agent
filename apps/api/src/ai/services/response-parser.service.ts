/**
 * ------------------------------------------------------------------
 * Response Parser Service
 * ------------------------------------------------------------------
 * Safely parses AI responses into JavaScript objects.
 * ------------------------------------------------------------------
 */

import { AIProviderError } from "../providers/ai-provider.error.js";

export class ResponseParserService {
  /**
   * Parse a JSON object or array from an AI response.
   */
  parse<T>(response: string): T {
    const candidates = this.extractCandidates(response);

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Try the next candidate: a model that wrapped its JSON in prose or a
        // markdown fence still produces a parseable substring.
      }
    }

    // The raw text is included because it is the model's own output for an
    // already-issued request; it never contains the API key or request headers.
    throw new AIProviderError(
      "AI_INVALID_RESPONSE",
      `Failed to parse AI response as JSON.\n\nResponse:\n${truncate(response)}`
    );
  }

  /**
   * Ordered attempts at isolating the JSON payload, most explicit first.
   */
  private extractCandidates(response: string): string[] {
    const candidates: string[] = [];

    const trimmed = response.trim();
    if (trimmed) candidates.push(trimmed);

    // ```json ... ``` including fences that sit on their own lines and
    // responses that mix prose with a fenced block.
    const fence = /```(?:json|JSON)?\s*\r?\n([\s\S]*?)```/.exec(response);
    if (fence?.[1]) candidates.push(fence[1].trim());

    // The outermost balanced { ... } or [ ... ] run, which is what survives
    // when a model prefixes an explanation or appends a closing remark.
    const braced = /[{[][\s\S]*[}\]]/.exec(response);
    if (braced?.[0]) candidates.push(braced[0].trim());

    return candidates.filter((candidate, index) => candidate && candidates.indexOf(candidate) === index);
  }
}

function truncate(value: string, max = 2000): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

export const responseParser = new ResponseParserService();
