import { z } from "zod";

export const RoadmapStepSchema = z.object({
  title: z.string(),

  description: z.string(),

  estimatedDuration: z.string(),

  resources: z.array(z.string()),

  completed: z.boolean().default(false),
});

export const CareerRoadmapSchema = z.object({
  goal: z.string(),

  currentLevel: z.string(),

  estimatedCompletionTime: z.string(),

  roadmap: z.array(RoadmapStepSchema),
});

export type CareerRoadmap = z.infer<
  typeof CareerRoadmapSchema
>;