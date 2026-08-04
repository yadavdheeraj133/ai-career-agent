import { z } from "zod";

export const InterviewQuestionSchema = z.object({
  question: z.string(),
  answer: z.string(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  tips: z.array(z.string()),
});

export const InterviewPreparationSchema = z.object({
  companyName: z.string(),

  jobTitle: z.string(),

  technicalQuestions: z.array(InterviewQuestionSchema),

  behavioralQuestions: z.array(InterviewQuestionSchema),

  hrQuestions: z.array(InterviewQuestionSchema),

  interviewTips: z.array(z.string()),

  confidenceScore: z.number().min(0).max(100),
});

export type InterviewPreparation = z.infer<
  typeof InterviewPreparationSchema
>;