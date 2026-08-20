import { z } from "zod";

export const ApplicationMessageSchema = z.object({
  subject: z.string(),

  message: z.string(),
});

export type ApplicationMessage = z.infer<
  typeof ApplicationMessageSchema
>;