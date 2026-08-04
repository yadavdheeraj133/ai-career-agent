import { z } from "zod";

export const CareerCoachSchema = z.object({
  currentLevel: z.string(),

  strengths: z.array(z.string()),

  weaknesses: z.array(z.string()),

  opportunities: z.array(z.string()),

  recommendations: z.array(z.string()),

  nextSteps: z.array(z.string()),

  motivation: z.string(),
});

export type CareerCoach = z.infer<typeof CareerCoachSchema>;