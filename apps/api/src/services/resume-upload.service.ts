import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { extractResumeDocument, extractResumeText, extractStructuredProfile } from "./resume-extraction.service.js";

const uploadRoot = path.resolve(process.cwd(), "uploads", "resumes");

export class ResumeUploadService {
  async upload(userId: string, file: Express.Multer.File) {
    const extension = path.extname(file.originalname).toLowerCase();
    const text = await extractResumeText(file.buffer, extension);
    if (!text) throw new Error("The uploaded resume does not contain readable text.");

    // One extraction, two projections of it: the canonical document the viewer
    // and AI tools read, and the flat profile legacy readers still expect.
    const document = extractResumeDocument(text);
    const parsedProfileJson = extractStructuredProfile(text) as unknown as Prisma.InputJsonValue;
    const title = path.basename(file.originalname, extension).slice(0, 100) || "Uploaded Resume";
    const fileName = `${userId}-${crypto.randomUUID()}${extension}`;
    const storagePath = path.posix.join("resumes", fileName);
    const absolutePath = path.join(uploadRoot, fileName);
    const previous = await prisma.resume.findUnique({ where: { userId } });

    // Persisted once, in the canonical shape every reader normalizes towards.
    const content = {
      title,
      summary: document.summary || null,
      skills: document.skills,
      experience: document.experience as unknown as Prisma.InputJsonValue,
      education: document.education as unknown as Prisma.InputJsonValue,
      projects: document.projects as unknown as Prisma.InputJsonValue,
      certifications: document.certifications as unknown as Prisma.InputJsonValue,
      achievements: document.achievements as unknown as Prisma.InputJsonValue,
      languages: document.languages,
      links: document.links,
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
    };

    await mkdir(uploadRoot, { recursive: true });
    await writeFile(absolutePath, file.buffer, { flag: "wx" });

    try {
      const resume = await prisma.resume.upsert({
        where: { userId },
        create: { userId, ...content },
        // Replacement content invalidates the previous ATS score.
        update: content,
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