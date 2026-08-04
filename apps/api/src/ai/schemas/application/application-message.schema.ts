import { z } from "zod";

export const ApplicationMessageSchema = z.object({
  message: z.string(),

  subject: z.string().optional(),

  tone: z.string(),

  wordCount: z.number().min(0),
});

export type ApplicationMessage = z.infer<
  typeof ApplicationMessageSchema
>;