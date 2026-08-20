import { z } from "zod";

const ExperienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  responsibilities: z.array(z.string()),
});

const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  graduationDate: z.string(),
});

const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const ImprovementSummarySchema = z.object({
  atsImprovements: z.array(z.string()),
  remainingMissingKeywords: z.array(z.string()),
  notes: z.array(z.string()),
});

export const ResumeTailorSchema = z.object({
  title: z.string(),

  summary: z.string(),

  experience: z.array(ExperienceSchema),

  education: z.array(EducationSchema),

  skills: z.array(z.string()),

  projects: z.array(ProjectSchema),

  certifications: z.array(z.string()),

  achievements: z.array(z.string()),

  languages: z.array(z.string()),

  links: z.array(z.string()),

  improvementSummary: ImprovementSummarySchema,
});

export type ResumeTailor = z.infer<
  typeof ResumeTailorSchema
>;