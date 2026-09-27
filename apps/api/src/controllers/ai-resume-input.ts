import type { Request, Response } from "express";

import { resolveAiResumeInput } from "../services/ai-resume-input.service.js";

/**
 * Shared request helper for every AI endpoint that consumes a resume.
 *
 * Returns the resume text to use, or `null` after having already sent a 400 —
 * so callers only need `if (!resume) return;`.
 */
export const NO_RESUME_MESSAGE =
  "resume is required and must be a non-empty string. Upload your resume to continue.";

export async function resolveResumeInput(
  req: Request,
  res: Response
): Promise<string | null> {
  const input = await resolveAiResumeInput(req.user.id, req.body?.resume);

  if (input.ok) {
    return input.resume;
  }

  res.status(400).json({ success: false, message: NO_RESUME_MESSAGE });
  return null;
}
