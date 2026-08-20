import { z } from "zod";

export const RoadmapStepSchema = z.object({
  title: z.string(),

  objective: z.string(),

  skills: z.array(z.string()),

  projects: z.array(z.string()),

  certifications: z.array(z.string()),

  expectedOutcome: z.string(),
});

export const CareerRoadmapSchema = z.object({
  currentLevel: z.string(),

  targetRole: z.string(),

  estimatedTimeline: z.string(),

  roadmap: z.array(RoadmapStepSchema),

  successTips: z.array(z.string()),

  finalAdvice: z.string(),
});

export type CareerRoadmap = z.infer<
  typeof CareerRoadmapSchema
>;