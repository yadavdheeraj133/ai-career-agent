import {
  aiService,
  responseParser,
  schemaValidator,
} from "../ai/services/index.js";

import * as ApplicationPrompts from "../ai/prompts/application/index.js";

import {
  CoverLetterSchema,
  ApplicationMessageSchema,
  ApplicationAnswerSchema,
  type CoverLetter,
  type ApplicationMessage,
  type ApplicationAnswer,
} from "../ai/schemas/application/index.js";

export class ApplicationAIService {
  async generateCoverLetter(
    resume: string,
    jobDescription: string
  ): Promise<CoverLetter> {
    const response = await aiService.generate({
      systemPrompt:
        ApplicationPrompts.COVER_LETTER_SYSTEM_PROMPT,

      userPrompt:
        ApplicationPrompts.buildCoverLetterPrompt({
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<CoverLetter>(
        response.content
      );

    return schemaValidator.validate(CoverLetterSchema, parsed);
  }

  async generateApplicationMessage(
    resume: string,
    jobDescription: string,
    companyName?: string,
    jobTitle?: string,
    candidateName?: string,
     platform?:
  | "linkedin"
  | "email"
  | "wellfound"
  | "instahyre"
  | "cutshort"
  | "naukri"
  | "indeed"
  | "peerlist"
  | "unstop"
  | "yc-jobs"
  | "referral"
  | "other"
  ): Promise<ApplicationMessage> {
    const response = await aiService.generate({
      systemPrompt:
        ApplicationPrompts.APPLICATION_MESSAGE_SYSTEM_PROMPT,

      userPrompt:
        ApplicationPrompts.buildApplicationMessagePrompt({
          resume,
          jobDescription,
          companyName,
          jobTitle,
          candidateName,
          platform,
        }),
    });

    const parsed =
      responseParser.parse<ApplicationMessage>(
        response.content
      );

    return schemaValidator.validate(ApplicationMessageSchema, parsed);
  }

  async generateApplicationAnswer(
    question: string,
    resume: string,
    jobDescription: string
  ): Promise<ApplicationAnswer> {
    const response = await aiService.generate({
      systemPrompt:
        ApplicationPrompts.APPLICATION_ANSWER_SYSTEM_PROMPT,

      userPrompt:
        ApplicationPrompts.buildApplicationAnswerPrompt({
          question,
          resume,
          jobDescription,
        }),
    });

    const parsed =
      responseParser.parse<ApplicationAnswer>(
        response.content
      );

    return schemaValidator.validate(ApplicationAnswerSchema, parsed);
  }
}

export const applicationAIService =
  new ApplicationAIService();