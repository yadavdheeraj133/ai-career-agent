import { z } from "zod";

export const LearningResourceSchema = z.object({
  title: z.string(),

  type: z.enum([
    "Course",
    "Book",
    "Video",
    "Documentation",
    "Project",
  ]),

  url: z.string().optional(),

  duration: z.string(),
});

export const LearningPathSchema = z.object({
  targetRole: z.string(),

  currentLevel: z.string(),

  estimatedCompletionTime: z.string(),

  skillsToLearn: z.array(z.string()),

  resources: z.array(LearningResourceSchema),

  projects: z.array(z.string()),
});

export type LearningPath = z.infer<
  typeof LearningPathSchema
>;