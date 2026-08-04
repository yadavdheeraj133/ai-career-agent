import { z } from "zod";

export const JobSummarySchema = z.object({
  summary: z.string(),

  responsibilities: z.array(z.string()),

  requiredSkills: z.array(z.string()),

  preferredSkills: z.array(z.string()),

  experience: z.string(),

  education: z.string(),

  location: z.string(),

  salary: z.string(),

  employmentType: z.string(),
});

export type JobSummary = z.infer<typeof JobSummarySchema>;