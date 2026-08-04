import { z } from "zod";

export const ApplicationAnswerSchema = z.object({
  question: z.string(),

  answer: z.string(),

  confidence: z.number().min(0).max(100),

  keyPoints: z.array(z.string()),
});

export type ApplicationAnswer = z.infer<
  typeof ApplicationAnswerSchema
>;