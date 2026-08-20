import { z } from "zod";

export const CoverLetterSchema = z.object({
  greeting: z.string(),

  introduction: z.string(),

  body: z.array(z.string()),

  closing: z.string(),

  signature: z.string(),
});

export type CoverLetter = z.infer<
  typeof CoverLetterSchema
>;