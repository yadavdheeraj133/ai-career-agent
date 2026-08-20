import { z } from "zod";

export const SkillInfoSchema = z.object({
  skill: z.string(),
  priority: z.enum(["High", "Medium", "Low"]),
  reason: z.string(),
});

export const StrengthSchema = z.object({
  strength: z.string(),
  reason: z.string().optional(),
});

export const SkillGapSchema = z.object({
  overallSkillMatch: z.number().min(0).max(100),

  existingSkills: z.array(SkillInfoSchema),

  missingSkills: z.array(SkillInfoSchema),

  criticalSkills: z.array(SkillInfoSchema),

  niceToHaveSkills: z.array(SkillInfoSchema),

  strengths: z.array(StrengthSchema),

  learningPriorities: z.array(SkillInfoSchema),

  recommendations: z.array(SkillInfoSchema),
});

export type SkillGap = z.infer<typeof SkillGapSchema>;

