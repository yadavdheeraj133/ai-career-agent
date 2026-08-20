import { z } from "zod";

const SkillMatchSchema = z.object({
  skill: z.string(),
  reason: z.string(),
});

const StrengthSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const WeaknessSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const ResumeJobMatchSchema = z.object({
  overallMatch: z.number().min(0).max(100),

  matchedSkills: z.array(SkillMatchSchema),

  missingSkills: z.array(SkillMatchSchema),

  experienceMatch: z.number().min(0).max(100),

  educationMatch: z.number().min(0).max(100),

  strengths: z.array(StrengthSchema),

  weaknesses: z.array(WeaknessSchema),

  recommendations: z.array(z.string()),
});

export type ResumeJobMatch = z.infer<
  typeof ResumeJobMatchSchema
>;