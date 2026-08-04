import { z } from "zod";

export const ResumeTailorSectionSchema = z.object({
  original: z.string(),
  improved: z.string(),
  reason: z.string(),
});

export const ResumeTailorSchema = z.object({
  summary: ResumeTailorSectionSchema.optional(),

  experience: z.array(ResumeTailorSectionSchema),

  projects: z.array(ResumeTailorSectionSchema),

  skills: z.array(z.string()),

  keywordsAdded: z.array(z.string()),

  atsScoreBefore: z.number().min(0).max(100),

  atsScoreAfter: z.number().min(0).max(100),

  recommendations: z.array(z.string()),
});

export type ResumeTailor = z.infer<typeof ResumeTailorSchema>;