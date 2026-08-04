import {
  ResumePrompts,
  ApplicationPrompts,
  InterviewPrompts,
  CareerPrompts,
} from "../prompts/index.js";

export class PromptService {
  // ------------------------------------------------------------------
  // Resume
  // ------------------------------------------------------------------

  buildResumeAnalysisPrompt(resume: string): string {
    return ResumePrompts.buildResumeAnalysisPrompt({
      resume,
    });
  }

  buildATSPrompt(
    resume: string,
    jobDescription: string
  ): string {
    return ResumePrompts.buildATSPrompt({
      resume,
      jobDescription,
    });
  }

  buildSkillGapPrompt(
    resume: string,
    jobDescription: string
  ): string {
    return ResumePrompts.buildSkillGapPrompt({
      resume,
      jobDescription,
    });
  }

  buildResumeTailorPrompt(
    resume: string,
    jobDescription: string
  ): string {
    return ResumePrompts.buildResumeTailorPrompt({
      resume,
      jobDescription,
    });
  }

  // ------------------------------------------------------------------
  // Application
  // ------------------------------------------------------------------

  buildCoverLetterPrompt(
    resume: string,
    jobDescription: string
  ): string {
    return ApplicationPrompts.buildCoverLetterPrompt({
      resume,
      jobDescription,
    });
  }

  buildApplicationMessagePrompt(
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
  ): string {
    return ApplicationPrompts.buildApplicationMessagePrompt({
      resume,
      jobDescription,
      companyName,
      jobTitle,
      candidateName,
      platform,
    });
  }

  buildApplicationAnswerPrompt(
    question: string,
    resume: string,
    jobDescription: string
  ): string {
    return ApplicationPrompts.buildApplicationAnswerPrompt({
      question,
      resume,
      jobDescription,
    });
  }

  // ------------------------------------------------------------------
  // Interview
  // ------------------------------------------------------------------

  buildInterviewPreparationPrompt(
    resume: string,
    jobDescription: string
  ): string {
    return InterviewPrompts.buildInterviewPreparationPrompt({
      resume,
      jobDescription,
    });
  }

  buildJobSummaryPrompt(
    jobDescription: string
  ): string {
    return InterviewPrompts.buildJobSummaryPrompt({
      jobDescription,
    });
  }

  buildCompanyInsightPrompt(
    companyInformation: string
  ): string {
    return InterviewPrompts.buildCompanyInsightPrompt({
      companyInformation,
    });
  }

  // ------------------------------------------------------------------
  // Career
  // ------------------------------------------------------------------

  buildCareerCoachPrompt(
    resume: string,
    careerGoal: string
  ): string {
    return CareerPrompts.buildCareerCoachPrompt({
      resume,
      careerGoal,
    });
  }

  buildCareerRoadmapPrompt(
    resume: string,
    currentRole: string,
    careerGoal: string
  ): string {
    return CareerPrompts.buildCareerRoadmapPrompt({
      resume,
      currentRole,
      careerGoal,
    });
  }

  buildLearningPathPrompt(
    resume: string,
    careerGoal: string
  ): string {
    return CareerPrompts.buildLearningPathPrompt({
      resume,
      careerGoal,
    });
  }
}

export const promptService = new PromptService();