import { z } from "zod";

export const ATSSectionAnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  experience: z.string(),
  projects: z.string(),
  skills: z.string(),
  education: z.string(),
  certifications: z.string(),
});

export const ATSSchema = z.object({
  overallScore: z.number().min(0).max(100),

  keywordMatch: z.number().min(0).max(100),

  requiredSkillsMatch: z.number().min(0).max(100),

  preferredSkillsMatch: z.number().min(0).max(100),

  experienceMatch: z.number().min(0).max(100),

  educationMatch: z.number().min(0).max(100),

  matchedKeywords: z.array(z.string()),

  missingKeywords: z.array(z.string()),

  criticalMissingKeywords: z.array(z.string()),

  parsingIssues: z.array(z.string()),

  sectionAnalysis: ATSSectionAnalysisSchema,

  recommendations: z.array(z.string()),
});

export type ATS = z.infer<typeof ATSSchema>;