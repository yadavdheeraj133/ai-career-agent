import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { careerAIService } from "./resume-ai.service.js";
import type { ATS } from "../ai/schemas/resume/index.js";

/** Minimum overall ATS score required to continue onboarding. */
export const ATS_PASS_THRESHOLD = 85;

const MAX_JOB_DESCRIPTION_LENGTH = 50000;

export interface AtsOnboardingStatus {
  hasResume: boolean;
  atsScore: number | null;
  atsCheckedAt: string | null;
  passed: boolean;
  threshold: number;
}

export interface AtsCheckResult extends AtsOnboardingStatus {
  result: ATS;
}

function toStatus(
  resume: { atsScore: number | null; atsCheckedAt: Date | null } | null
): AtsOnboardingStatus {
  const atsScore = resume?.atsScore ?? null;
  return {
    hasResume: resume !== null,
    atsScore,
    atsCheckedAt: resume?.atsCheckedAt?.toISOString() ?? null,
    passed: atsScore !== null && atsScore >= ATS_PASS_THRESHOLD,
    threshold: ATS_PASS_THRESHOLD,
  };
}

export class AtsOnboardingService {
  async getStatus(userId: string): Promise<AtsOnboardingStatus> {
    const resume = await prisma.resume.findUnique({
      where: { userId },
      select: { atsScore: true, atsCheckedAt: true },
    });

    return toStatus(resume);
  }

  /**
   * Runs the existing ATS analysis against the authenticated user's stored
   * resume text and persists the score. The resume text always comes from the
   * database — never from the client — so a caller cannot fabricate a score
   * by submitting crafted resume content.
   */
  async runCheck(userId: string, jobDescription: string): Promise<AtsCheckResult> {
    if (
      typeof jobDescription !== "string" ||
      jobDescription.trim().length === 0 ||
      jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH
    ) {
      throw new Error(
        "jobDescription is required and must be a non-empty string."
      );
    }

    const resume = await prisma.resume.findUnique({ where: { userId } });

    if (!resume?.rawText || resume.rawText.trim().length === 0) {
      throw new Error("No resume found. Upload a resume before running the ATS check.");
    }

    const result = await careerAIService.analyzeATS(
      resume.rawText,
      jobDescription
    );

    const updated = await prisma.resume.update({
      where: { userId },
      data: {
        atsScore: result.overallScore,
        atsCheckedAt: new Date(),
        atsResult: result as unknown as Prisma.InputJsonValue,
      },
      select: { atsScore: true, atsCheckedAt: true },
    });

    return {
      ...toStatus(updated),
      hasResume: true,
      result,
    };
  }
}

export const atsOnboardingService = new AtsOnboardingService();
