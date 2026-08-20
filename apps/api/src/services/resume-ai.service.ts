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
  ResumeJobMatchSchema,

  type ResumeAnalysis,
  type ATS,
  type SkillGap,
  type ResumeTailor,
  type ResumeJobMatch,
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

    console.log("\n======================================");
    console.log("RESUME ANALYSIS RESPONSE");
    console.log("======================================");
    console.log(JSON.stringify(parsed, null, 2));

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

    console.log("\n======================================");
    console.log("ATS RESPONSE");
    console.log("======================================");
    console.log(JSON.stringify(parsed, null, 2));

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

    console.log("\n======================================");
    console.log("SKILL GAP RESPONSE");
    console.log("======================================");
    console.log(JSON.stringify(parsed, null, 2));

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

    console.log("\n======================================");
    console.log("RESUME TAILOR RESPONSE");
    console.log("======================================");
    console.log(JSON.stringify(parsed, null, 2));

    return ResumeTailorSchema.parse(parsed);
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

    console.log("\n======================================");
    console.log("RESUME JOB MATCH RESPONSE");
    console.log("======================================");
    console.log(JSON.stringify(parsed, null, 2));

    return ResumeJobMatchSchema.parse(parsed);
  }
}

export const careerAIService =
  new CareerAIService();