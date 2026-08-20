import { z } from "zod";

export const CareerCoachSchema = z.object({
  currentLevel: z.string(),

  careerGoal: z.string(),

  strengths: z.array(z.string()),

  weaknesses: z.array(z.string()),

  transferableSkills: z.array(z.string()),

  careerReadiness: z.string(),

  recommendedNextSteps: z.array(z.string()),

  commonMistakesToAvoid: z.array(z.string()),

  motivation: z.string(),
});

export type CareerCoach = z.infer<
  typeof CareerCoachSchema
>;