import { z } from "zod";

const experienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  currentlyWorking: z.boolean().optional(),
  description: z.string().optional(),
});

const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  grade: z.string().optional(),
});

const projectSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  technologies: z.array(z.string()).optional(),
  github: z.string().url().optional(),
  liveDemo: z.string().url().optional(),
});

const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  issueDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
});

const achievementSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

const linksSchema = z.object({
  github: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  portfolio: z.string().url().optional(),
  website: z.string().url().optional(),
});

export const createResumeSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),

  summary: z
    .string()
    .max(1000, "Summary cannot exceed 1000 characters")
    .optional(),

  experience: z.array(experienceSchema).optional(),

  education: z.array(educationSchema).optional(),

  skills: z.array(z.string()).optional(),

  projects: z.array(projectSchema).optional(),

  certifications: z.array(certificationSchema).optional(),

  achievements: z.array(achievementSchema).optional(),

  languages: z.array(z.string()).optional(),

  links: linksSchema.optional(),

  template: z.string().optional(),

  isDefault: z.boolean().optional(),
});

export type CreateResumeInput = z.infer<typeof createResumeSchema>;