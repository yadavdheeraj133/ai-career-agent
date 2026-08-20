import { z } from "zod";

export const InterviewQuestionSchema = z.object({
  question: z.string(),

  reason: z.string(),

  sampleAnswer: z.string(),

  followUpQuestions: z.array(z.string()),
});

export const InterviewPreparationSchema = z.object({
  overview: z.string(),

  interviewDifficulty: z.string(),

  keyFocusAreas: z.array(z.string()),

  technicalQuestions: z.array(
    InterviewQuestionSchema
  ),

  behavioralQuestions: z.array(
    InterviewQuestionSchema
  ),

  projectQuestions: z.array(
    InterviewQuestionSchema
  ),

  resumeQuestions: z.array(
    InterviewQuestionSchema
  ),

  weakAreas: z.array(z.string()),

  preparationTips: z.array(z.string()),

  finalAdvice: z.string(),
});

export type InterviewPreparation = z.infer<
  typeof InterviewPreparationSchema
>;