import { z } from "zod";

export const ATSSchema = z.object({
  overallScore: z.number().min(0).max(100),

  keywordMatch: z.number().min(0).max(100),

  requiredSkillsMatch: z.number().min(0).max(100),

  preferredSkillsMatch: z.number().min(0).max(100),

  missingKeywords: z.array(z.string()),

  matchedKeywords: z.array(z.string()),

  recommendations: z.array(z.string()),
});

export type ATS = z.infer<typeof ATSSchema>;