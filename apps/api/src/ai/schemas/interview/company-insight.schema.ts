import { z } from "zod";

export const CompanyInsightSchema = z.object({
  companyName: z.string(),

  overview: z.string(),

  industry: z.string(),

  techStack: z.array(z.string()),

  companyCulture: z.array(z.string()),

  interviewProcess: z.array(z.string()),

  strengths: z.array(z.string()),

  challenges: z.array(z.string()),
});

export type CompanyInsight = z.infer<
  typeof CompanyInsightSchema
>;