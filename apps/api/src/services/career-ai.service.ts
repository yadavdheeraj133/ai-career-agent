import {
  aiService,
  responseParser,
  schemaValidator,
} from "../ai/services/index.js";

import * as CareerPrompts from "../ai/prompts/career/index.js";
import * as ResumePrompts from "../ai/prompts/resume/index.js";

import {
  CareerCoachSchema,
  CareerRoadmapSchema,
  LearningPathSchema,
  type CareerCoach,
  type CareerRoadmap,
  type LearningPath,
} from "../ai/schemas/career/index.js";

import {
  ResumeJobMatchSchema,
  type ResumeJobMatch,
} from "../ai/schemas/resume/index.js";

export class CareerGuidanceAIService {
  async generateCareerCoach(
    resume: string,
    currentRole: string,
    careerGoal: string
  ): Promise<CareerCoach> {
    const response = await aiService.generate({
      systemPrompt:
        CareerPrompts.CAREER_COACH_SYSTEM_PROMPT,

      userPrompt:
        CareerPrompts.buildCareerCoachPrompt({
          resume,
          careerGoal,
        }),
    });

    const parsed =
      responseParser.parse<CareerCoach>(
        response.content
      );

    return schemaValidator.validate(CareerCoachSchema, parsed);
  }

  async generateCareerRoadmap(
    resume: string,
    currentRole: string,
    careerGoal: string
  ): Promise<CareerRoadmap> {
    const response = await aiService.generate({
      systemPrompt:
        CareerPrompts.CAREER_ROADMAP_SYSTEM_PROMPT,

      userPrompt:
        CareerPrompts.buildCareerRoadmapPrompt({
          resume,
          currentRole,
          careerGoal,
        }),
    });

    const parsed =
      responseParser.parse<CareerRoadmap>(
        response.content
      );

    return schemaValidator.validate(CareerRoadmapSchema, parsed);
  }

  async generateLearningPath(
    resume: string,
    careerGoal: string
  ): Promise<LearningPath> {
    const response = await aiService.generate({
      systemPrompt:
        CareerPrompts.LEARNING_PATH_SYSTEM_PROMPT,

      userPrompt:
        CareerPrompts.buildLearningPathPrompt({
          resume,
          careerGoal,
        }),
    });

    const parsed =
      responseParser.parse<LearningPath>(
        response.content
      );

    return schemaValidator.validate(LearningPathSchema, parsed);
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
}

export const careerGuidanceAIService =
  new CareerGuidanceAIService();