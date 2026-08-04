/**
 * ------------------------------------------------------------------
 * Response Parser Service
 * ------------------------------------------------------------------
 * Safely parses AI responses into JavaScript objects.
 * Handles markdown code blocks and invalid JSON.
 * ------------------------------------------------------------------
 */

export class ResponseParserService {
  /**
   * Parse a JSON object or array from an AI response.
   */
  parse<T>(response: string): T {
    const cleaned = this.clean(response);

    try {
      return JSON.parse(cleaned) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse AI response as JSON.\n\nResponse:\n${response}`
      );
    }
  }

  /**
   * Remove markdown code fences.
   */
  private clean(response: string): string {
    return response
      .trim()
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/, "")
      .trim();
  }
}

export const responseParser = new ResponseParserService();