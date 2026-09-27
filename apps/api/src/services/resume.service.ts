import { resumeRepository } from "../repositories/resume.repository.js";
import { CreateResumeInput } from "../validators/auth/create-resume.validator.js";
import {
  hasResumeContent,
  toResumeDocument,
  toResumeText,
  type ResumeDocument,
} from "./resume-document.service.js";

/** The canonical resume plus the file metadata the UI needs around it. */
export interface PrimaryResume {
  document: ResumeDocument;
  /** Rendered from `document`, so AI input and on-screen content never differ. */
  plainText: string;
  meta: {
    id: string;
    title: string;
    originalFileName: string | null;
    uploadedAt: string | null;
    fileSize: number | null;
    hasOriginalFile: boolean;
  } | null;
}

export class ResumeService {
  async createResume(userId: string, data: CreateResumeInput) {
    const existingResume = await resumeRepository.getResumeByUserId(userId);

    if (existingResume) {
      throw new Error("Resume already exists.");
    }

    return resumeRepository.createResume(userId, data);
  }

  async getResume(userId: string) {
    const resume = await resumeRepository.getResumeByUserId(userId);

    if (!resume) {
      throw new Error("Resume not found.");
    }

    return resume;
  }

  /**
   * The single entry point for reading a user's resume. Every caller (AI tools,
   * the web viewer, the PDF writer) goes through here so none of them can drift
   * onto a different shape or a stale copy.
   */
  async getPrimaryResume(userId: string): Promise<PrimaryResume | null> {
    const resume = await resumeRepository.getResumeByUserId(userId);
    if (!resume) return null;

    const document = toResumeDocument(resume);

    return {
      document,
      plainText: toResumeText(document),
      meta: {
        id: resume.id,
        title: resume.title,
        originalFileName: resume.originalFileName,
        uploadedAt: resume.uploadedAt?.toISOString() ?? null,
        fileSize: resume.fileSize,
        hasOriginalFile: Boolean(resume.storagePath),
      },
    };
  }

  /**
   * Resume text for the AI tools. Uses the stored `rawText` when present so
   * prompts see exactly what the candidate uploaded, and falls back to the
   * rendered document for resumes created through the CRUD endpoints.
   */
  async getResumeTextForAi(userId: string): Promise<string | null> {
    const resume = await resumeRepository.getResumeByUserId(userId);
    if (!resume) return null;

    const rawText = resume.rawText?.trim();
    if (rawText) return rawText;

    const primary = await this.getPrimaryResume(userId);
    if (!primary || !hasResumeContent(primary.document)) return null;

    return primary.plainText || null;
  }

  async updateResume(
    userId: string,
    data: Partial<CreateResumeInput>
  ) {
    const resume = await resumeRepository.getResumeByUserId(userId);

    if (!resume) {
      throw new Error("Resume not found.");
    }

    return resumeRepository.updateResume(userId, data);
  }

  async deleteResume(userId: string) {
    const resume = await resumeRepository.getResumeByUserId(userId);

    if (!resume) {
      throw new Error("Resume not found.");
    }

    return resumeRepository.deleteResume(userId);
  }
}

export const resumeService = new ResumeService();