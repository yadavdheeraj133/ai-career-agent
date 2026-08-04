import { z } from "zod";

/**
 * ------------------------------------------------------------
 * Resume Analysis Response Schema
 * ------------------------------------------------------------
 */

export const ResumeSectionScoreSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
});

export const ResumeAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),

  summary: z.string(),

  strengths: z.array(z.string()),

  weaknesses: z.array(z.string()),

  recommendations: z.array(z.string()),

  sections: z.object({
    title: ResumeSectionScoreSchema,

    summary: ResumeSectionScoreSchema,

    experience: ResumeSectionScoreSchema,

    projects: ResumeSectionScoreSchema,

    skills: ResumeSectionScoreSchema,

    education: ResumeSectionScoreSchema,

    certifications: ResumeSectionScoreSchema,

    achievements: ResumeSectionScoreSchema,

    languages: ResumeSectionScoreSchema,

    links: ResumeSectionScoreSchema,

    formatting: ResumeSectionScoreSchema,
  }),
});

export type ResumeAnalysis = z.infer<
  typeof ResumeAnalysisSchema
>;