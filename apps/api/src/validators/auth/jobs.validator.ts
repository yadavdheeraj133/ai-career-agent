import { z } from "zod";

export const createJobSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),

  company: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name cannot exceed 100 characters"),

  location: z
    .string()
    .min(2, "Location is required")
    .max(100, "Location cannot exceed 100 characters"),

  workMode: z.enum(["Remote", "Hybrid", "Onsite"]),

  jobType: z.enum([
    "Full-time",
    "Part-time",
    "Internship",
    "Contract",
    "Freelance",
  ]),

  experience: z.string().optional(),

  salaryMin: z
    .number()
    .int()
    .nonnegative()
    .optional(),

  salaryMax: z
    .number()
    .int()
    .nonnegative()
    .optional(),

  currency: z
    .string()
    .length(3, "Currency must be a 3-letter code")
    .optional(),

  description: z
    .string()
    .max(10000)
    .optional(),

  source: z
    .string()
    .min(2)
    .max(50),

  url: z
    .string()
    .url("Invalid job URL"),
});

export const updateJobSchema = createJobSchema.partial();