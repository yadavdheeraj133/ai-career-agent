import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { extractResumeText, extractStructuredProfile } from "./resume-extraction.service.js";

const uploadRoot = path.resolve(process.cwd(), "uploads", "resumes");

export class ResumeUploadService {
  async upload(userId: string, file: Express.Multer.File) {
    const extension = path.extname(file.originalname).toLowerCase();
    const text = await extractResumeText(file.buffer, extension);
    if (!text) throw new Error("The uploaded resume does not contain readable text.");

    const parsedProfile = extractStructuredProfile(text);
    const parsedProfileJson = parsedProfile as unknown as Prisma.InputJsonValue;
    const fileName = `${userId}-${crypto.randomUUID()}${extension}`;
    const storagePath = path.posix.join("resumes", fileName);
    const absolutePath = path.join(uploadRoot, fileName);
    const previous = await prisma.resume.findUnique({ where: { userId } });

    await mkdir(uploadRoot, { recursive: true });
    await writeFile(absolutePath, file.buffer, { flag: "wx" });

    try {
      const resume = await prisma.resume.upsert({
        where: { userId },
        create: {
          userId,
          title: path.basename(file.originalname, extension).slice(0, 100) || "Uploaded Resume",
          summary: parsedProfile.summary,
          skills: parsedProfile.skills,
          education: parsedProfile.education,
          experience: parsedProfile.experience,
          projects: parsedProfile.projects,
          certifications: parsedProfile.certifications,
          achievements: parsedProfile.achievements,
          parsedProfile: parsedProfileJson,
          rawText: text,
          originalFileName: file.originalname,
          storagePath,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
          // A new resume has no ATS state; the gate requires a fresh check.
          atsScore: null,
          atsCheckedAt: null,
          atsResult: Prisma.DbNull,
        },
        update: {
          title: path.basename(file.originalname, extension).slice(0, 100) || "Uploaded Resume",
          summary: parsedProfile.summary,
          skills: parsedProfile.skills,
          education: parsedProfile.education,
          experience: parsedProfile.experience,
          projects: parsedProfile.projects,
          certifications: parsedProfile.certifications,
          achievements: parsedProfile.achievements,
          parsedProfile: parsedProfileJson,
          rawText: text,
          originalFileName: file.originalname,
          storagePath,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
          // Replacement content invalidates the previous ATS score.
          atsScore: null,
          atsCheckedAt: null,
          atsResult: Prisma.DbNull,
        },
      });

      if (previous?.storagePath && previous.storagePath !== storagePath) {
        await unlink(path.join(uploadRoot, path.basename(previous.storagePath))).catch(() => undefined);
      }

      return resume;
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  async getFilePath(userId: string) {
    const resume = await prisma.resume.findUnique({ where: { userId } });
    if (!resume?.storagePath) throw new Error("Resume file not found.");
    return {
      path: path.join(uploadRoot, path.basename(resume.storagePath)),
      originalFileName: resume.originalFileName ?? "resume",
    };
  }
}

export const resumeUploadService = new ResumeUploadService();