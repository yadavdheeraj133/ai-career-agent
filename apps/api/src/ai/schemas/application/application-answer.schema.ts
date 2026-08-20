import { z } from "zod";

export const ApplicationAnswerSchema = z.object({
  question: z.string(),

  answer: z.string(),
});

export type ApplicationAnswer = z.infer<
  typeof ApplicationAnswerSchema
>;