import { z } from "zod";

export const LearningStageSchema = z.object({
  title: z.string(),

  description: z.string(),

  topics: z.array(z.string()),

  difficulty: z.string(),

  estimatedTime: z.string(),

  practice: z.array(z.string()),

  recommendedProjects: z.array(z.string()),
});

export const LearningPathSchema = z.object({
  careerGoal: z.string(),

  estimatedDuration: z.string(),

  learningPath: z.array(LearningStageSchema),

  recommendedResources: z.array(z.string()),

  studyTips: z.array(z.string()),

  finalAdvice: z.string(),
});

export type LearningPath = z.infer<
  typeof LearningPathSchema
>;