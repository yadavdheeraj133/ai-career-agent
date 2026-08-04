import { z } from "zod";

export const SkillSchema = z.object({
  name: z.string(),
  importance: z.enum(["high", "medium", "low"]),
  description: z.string().optional(),
});

export const SkillGapSchema = z.object({
  matchingSkills: z.array(z.string()),

  missingSkills: z.array(SkillSchema),

  recommendedLearningPath: z.array(z.string()),

  estimatedCompletionTime: z.string(),

  overallReadiness: z.number().min(0).max(100),
});

export type SkillGap = z.infer<typeof SkillGapSchema>;