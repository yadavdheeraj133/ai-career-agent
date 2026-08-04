import { resumeRepository } from "../repositories/resume.repository.js";
import { CreateResumeInput } from "../validators/auth/create-resume.validator.js";

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