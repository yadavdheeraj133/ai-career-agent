import {
  aiService,
  responseParser,
  schemaValidator,
} from "../ai/services/index.js";

import * as InterviewPrompts from "../ai/prompts/interview/index.js";

import {
  InterviewPreparationSchema,
  JobSummarySchema,
  CompanyInsightSchema,
  type InterviewPreparation,
  type JobSummary,
  type CompanyInsight,
} from "../ai/schemas/interview/index.js";

export class InterviewAIService {
  async prepareInterview(
    resume: string,
    jobDescription: string
  ): Promise<InterviewPreparation> {
    const response = await aiService.generate({
      systemPrompt:
        InterviewPrompts.INTERVIEW_PREPARATION_SYSTEM_PROMPT,

      userPrompt:
        InterviewPrompts.buildInterviewPreparationPrompt({
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<InterviewPreparation>(
        response.content
      );

    return schemaValidator.validate(InterviewPreparationSchema, parsed);
  }

  async generateJobSummary(
    jobDescription: string
  ): Promise<JobSummary> {
    const response = await aiService.generate({
      systemPrompt:
        InterviewPrompts.JOB_SUMMARY_SYSTEM_PROMPT,

      userPrompt:
        InterviewPrompts.buildJobSummaryPrompt({
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<JobSummary>(
        response.content
      );

    return schemaValidator.validate(JobSummarySchema, parsed);
  }

  async generateCompanyInsight(
    companyInformation: string
  ): Promise<CompanyInsight> {
    const response = await aiService.generate({
      systemPrompt:
        InterviewPrompts.COMPANY_INSIGHT_SYSTEM_PROMPT,

      userPrompt:
        InterviewPrompts.buildCompanyInsightPrompt({
          companyInformation,
        }),
    });

    const parsed =
      responseParser.parse<CompanyInsight>(
        response.content
      );

    return schemaValidator.validate(CompanyInsightSchema, parsed);
  }
}

export const interviewAIService =
  new InterviewAIService();