import {
  aiService,
  responseParser,
} from "../ai/services/index.js";

import * as ResumePrompts from "../ai/prompts/resume/index.js";

import {
  ResumeAnalysisSchema,
  ATSSchema,
  SkillGapSchema,
  ResumeTailorSchema,
  type ResumeAnalysis,
  type ATS,
  type SkillGap,
  type ResumeTailor,
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

    return ResumeAnalysisSchema.parse(parsed);
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

    return ATSSchema.parse(parsed);
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

    return SkillGapSchema.parse(parsed);
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

    return ResumeTailorSchema.parse(parsed);
  }
}

export const careerAIService = new CareerAIService();