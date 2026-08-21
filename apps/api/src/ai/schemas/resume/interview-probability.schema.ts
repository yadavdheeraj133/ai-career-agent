// apps/api/src/ai/schemas/resume/interview-probability.schema.ts

import { z } from "zod";

export const InterviewProbabilitySchema = z.object({
  probability: z.number().min(0).max(100),

  confidence: z.enum([
    "High",
    "Medium",
    "Low",
  ]),

  assessment: z.string(),

  positiveFactors: z.array(z.string()),

  riskFactors: z.array(z.string()),

  recommendations: z.array(z.string()),
});

export type InterviewProbability = z.infer<
  typeof InterviewProbabilitySchema
>;