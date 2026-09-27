/**
 * Turns an API failure into a message that is safe to show a user.
 *
 * AI boundary failures come back classified (502/503/504 with an `AI_*` code and
 * a message written for users), so the server's own message is preferred over
 * guessing at the cause.
 */

import { ApiError } from "./api";

/** Statuses the API uses for AI provider/boundary failures. */
const AI_FAILURE_STATUSES = [500, 502, 503, 504];

export function describeAiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Your session has expired. Please sign in again.";
    }

    if (AI_FAILURE_STATUSES.includes(error.status)) {
      return (
        error.message ||
        "The AI service is unavailable right now. Please try again later."
      );
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while contacting the AI service.";
}
