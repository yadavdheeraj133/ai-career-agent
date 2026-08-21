// apps/api/src/ai/schemas/resume/ai-verdict.schema.ts

import { z } from "zod";

export const AIVerdictSchema = z.object({
  verdict: z.enum([
    "Strong Match",
    "Good Match",
    "Moderate Match",
    "Weak Match",
  ]),

  score: z.number().min(0).max(100),

  summary: z.string(),

  reasons: z.array(z.string()),

  strengths: z.array(z.string()),

  concerns: z.array(z.string()),

  recommendation: z.string(),
});

export type AIVerdict = z.infer<
  typeof AIVerdictSchema
>;