import { z } from "zod";

export const ResumeAnalysisRequestSchema = z.object({
  resume: z
    .string()
    .trim()
    .min(1, "Resume is required.")
    .max(100000, "Resume is too large."),
});

export const ATSAnalysisRequestSchema = z.object({
  resume: z
    .string()
    .trim()
    .min(1, "Resume is required."),

  jobDescription: z
    .string()
    .trim()
    .min(1, "Job description is required."),
});

export const SkillGapRequestSchema = z.object({
  resume: z
    .string()
    .trim()
    .min(1),

  jobDescription: z
    .string()
    .trim()
    .min(1),
});

export const ResumeTailorRequestSchema = z.object({
  resume: z
    .string()
    .trim()
    .min(1),

  jobDescription: z
    .string()
    .trim()
    .min(1),
});

export type ResumeAnalysisRequest =
  z.infer<typeof ResumeAnalysisRequestSchema>;

export type ATSAnalysisRequest =
  z.infer<typeof ATSAnalysisRequestSchema>;

export type SkillGapRequest =
  z.infer<typeof SkillGapRequestSchema>;

export type ResumeTailorRequest =
  z.infer<typeof ResumeTailorRequestSchema>;