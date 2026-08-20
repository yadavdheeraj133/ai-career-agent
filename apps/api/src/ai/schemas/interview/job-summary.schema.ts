import { z } from "zod";

export const JobSummarySchema = z.object({
  jobTitle: z.string(),

  company: z.string(),

  employmentType: z.string(),

  experienceLevel: z.string(),

  location: z.string(),

  summary: z.string(),

  responsibilities: z.array(z.string()),

  requiredSkills: z.array(z.string()),

  preferredSkills: z.array(z.string()),

  technologies: z.array(z.string()),

  qualifications: z.array(z.string()),

  benefits: z.array(z.string()),

  salary: z.string(),
});

export type JobSummary = z.infer<
  typeof JobSummarySchema
>;