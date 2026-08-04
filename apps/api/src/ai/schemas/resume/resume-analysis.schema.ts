import { z } from "zod";

/**
 * ------------------------------------------------------------
 * Resume Analysis Response Schema
 * ------------------------------------------------------------
 */

export const StrengthSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const WeaknessSchema = z.object({
  title: z.string(),
  description: z.string(),
  improvement: z.string(),
});

export const ResumeAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),

  summary: z.string(),

  strengths: z.array(StrengthSchema),

  weaknesses: z.array(WeaknessSchema),

  sectionScores: z.object({
    title: z.number().min(0).max(100),

    summary: z.number().min(0).max(100),

    experience: z.number().min(0).max(100),

    projects: z.number().min(0).max(100),

    skills: z.number().min(0).max(100),

    education: z.number().min(0).max(100),

    certifications: z.number().min(0).max(100),

    achievements: z.number().min(0).max(100),

    languages: z.number().min(0).max(100),

    links: z.number().min(0).max(100),

    formatting: z.number().min(0).max(100),
  }),

  recommendations: z.array(z.string()),
});

export type ResumeAnalysis = z.infer<
  typeof ResumeAnalysisSchema
>;