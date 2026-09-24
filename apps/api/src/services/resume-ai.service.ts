// apps/api/src/services/resume-ai.service.ts

import {
  aiService,
  responseParser,
  schemaValidator,
} from "../ai/services/index.js";

import * as ResumePrompts from "../ai/prompts/resume/index.js";

import {
  ResumeAnalysisSchema,
  ATSSchema,
  SkillGapSchema,
  ResumeTailorSchema,
  ResumeJobMatchSchema,
  AIVerdictSchema,
  InterviewProbabilitySchema,

  type ResumeAnalysis,
  type ATS,
  type SkillGap,
  type ResumeTailor,
  type ResumeJobMatch,
  type AIVerdict,
  type InterviewProbability,
} from "../ai/schemas/resume/index.js";

export class CareerAIService {
  async analyzeResume(
    resume: string
  ): Promise<ResumeAnalysis> {
    const response = await aiService.generate({
      systemPrompt:
        ResumePrompts.RESUME_ANALYSIS_SYSTEM_PROMPT,

      userPrompt:
        ResumePrompts.buildResumeAnalysisPrompt({
          resume,
        }),
    });

    const parsed =
      responseParser.parse<ResumeAnalysis>(
        response.content
      );

    return schemaValidator.validate(ResumeAnalysisSchema, parsed);
  }

  async analyzeATS(
    resume: string,
    jobDescription: string
  ): Promise<ATS> {
    const response = await aiService.generate({
      systemPrompt:
        ResumePrompts.ATS_SYSTEM_PROMPT,

      userPrompt:
        ResumePrompts.buildATSPrompt({
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<ATS>(
        response.content
      );

    return schemaValidator.validate(ATSSchema, parsed);
  }

  async analyzeSkillGap(
    resume: string,
    jobDescription: string
  ): Promise<SkillGap> {
    const response = await aiService.generate({
      systemPrompt:
        ResumePrompts.SKILL_GAP_SYSTEM_PROMPT,

      userPrompt:
        ResumePrompts.buildSkillGapPrompt({
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<SkillGap>(
        response.content
      );

    return schemaValidator.validate(SkillGapSchema, parsed);
  }

  async tailorResume(
    resume: string,
    jobDescription: string
  ): Promise<ResumeTailor> {
    const response = await aiService.generate({
      systemPrompt:
        ResumePrompts.RESUME_TAILOR_SYSTEM_PROMPT,

      userPrompt:
        ResumePrompts.buildResumeTailorPrompt({
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<ResumeTailor>(
        response.content
      );

    return schemaValidator.validate(ResumeTailorSchema, parsed);
  }

  async matchResumeWithJob(
    resume: string,
    jobDescription: string
  ): Promise<ResumeJobMatch> {
    const response = await aiService.generate({
      systemPrompt:
        ResumePrompts.RESUME_JOB_MATCH_SYSTEM_PROMPT,

      userPrompt:
        ResumePrompts.buildResumeJobMatchPrompt({
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<ResumeJobMatch>(
        response.content
      );

    return schemaValidator.validate(ResumeJobMatchSchema, parsed);
  }

  async generateAIVerdict(
    resume: string,
    jobDescription: string
  ): Promise<AIVerdict> {
    const response = await aiService.generate({
      systemPrompt:
        ResumePrompts.AI_VERDICT_SYSTEM_PROMPT,

      userPrompt:
        ResumePrompts.buildAIVerdictPrompt({
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<AIVerdict>(
        response.content
      );

    return schemaValidator.validate(AIVerdictSchema, parsed);
  }

  async calculateInterviewProbability(
    resume: string,
    jobDescription: string
  ): Promise<InterviewProbability> {
    const response = await aiService.generate({
      systemPrompt:
        ResumePrompts.INTERVIEW_PROBABILITY_SYSTEM_PROMPT,

      userPrompt:
        ResumePrompts.buildInterviewProbabilityPrompt({
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<InterviewProbability>(
        response.content
      );

    return schemaValidator.validate(InterviewProbabilitySchema, parsed);
  }
}

export const careerAIService =
  new CareerAIService();