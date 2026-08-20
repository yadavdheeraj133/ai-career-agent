import { z } from "zod";

export const CompanyInsightSchema = z.object({
  companyName: z.string(),

  industry: z.string(),

  overview: z.string(),

  mission: z.string(),

  vision: z.string(),

  products: z.array(z.string()),

  services: z.array(z.string()),

  technologies: z.array(z.string()),

  culture: z.array(z.string()),

  values: z.array(z.string()),

  benefits: z.array(z.string()),

  hiringFocus: z.array(z.string()),

  recentNews: z.array(z.string()),

  candidateTalkingPoints: z.array(z.string()),

  summary: z.string(),
});

export type CompanyInsight = z.infer<
  typeof CompanyInsightSchema
>;