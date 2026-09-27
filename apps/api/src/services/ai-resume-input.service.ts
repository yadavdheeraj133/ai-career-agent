import { resumeService } from "./resume.service.js";

/**
 * Resolves the resume text an AI endpoint should operate on.
 *
 * Every AI feature that consumes a resume goes through here, so they all share
 * one rule: a `resume` supplied by the caller still wins as an explicit
 * one-off override, but it is no longer required. When it is absent or blank the
 * authenticated user's stored primary resume is loaded server-side, which is
 * what makes replacing an upload immediately affect every AI feature instead of
 * leaving them working from a stale pasted copy.
 *
 * A non-string `resume` is a malformed request rather than a missing one, and is
 * reported separately so it is never silently replaced by the stored resume.
 */

const MAX_RESUME_LENGTH = 50000;

export type AiResumeInput =
  | { ok: true; resume: string; source: "request" | "stored" }
  | { ok: false; reason: "invalid" | "missing" };

export async function resolveAiResumeInput(
  userId: string,
  provided: unknown
): Promise<AiResumeInput> {
  if (provided !== undefined && provided !== null && typeof provided !== "string") {
    return { ok: false, reason: "invalid" };
  }

  if (typeof provided === "string") {
    const trimmed = provided.trim();

    if (trimmed.length > MAX_RESUME_LENGTH) {
      return { ok: false, reason: "invalid" };
    }

    if (trimmed.length > 0) {
      return { ok: true, resume: provided, source: "request" };
    }
  }

  const stored = await resumeService.getResumeTextForAi(userId);
  if (stored) {
    return { ok: true, resume: stored, source: "stored" };
  }

  return { ok: false, reason: "missing" };
}
