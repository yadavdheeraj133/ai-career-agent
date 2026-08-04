import { z } from "zod";

export const CoverLetterSchema = z.object({
  coverLetter: z.string(),

  introduction: z.string(),

  body: z.array(z.string()),

  conclusion: z.string(),

  keyHighlights: z.array(z.string()),

  tone: z.string(),

  wordCount: z.number().min(0),
});

export type CoverLetter = z.infer<typeof CoverLetterSchema>;