import { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { toResumeDocument } from "../services/resume-document.service.js";
import { renderResumePdf } from "../services/resume-pdf.service.js";
import { resumeService } from "../services/resume.service.js";

/**
 * Turns a tailored resume into a real PDF.
 *
 * Tailored output is not persisted: it is a derivative of the primary resume,
 * generated on demand from the structured result the caller already holds. That
 * keeps a single source of truth for a user's resume and means there is no
 * stored tailored artefact another account could ever reach. The request is
 * still authenticated, and the payload is re-validated and re-normalized
 * server-side rather than trusted as-is.
 */

/**
 * Accepts the tailored structure in whatever shape it arrives — the tailor
 * schema emits objects for experience and strings for certifications, and
 * `toResumeDocument` already normalizes both. Validating structure here would
 * only reject real output; the meaningful check is that there is content to
 * render at all.
 */
const tailoredResumeSchema = z
  .object({
    title: z.string().max(200).optional(),
    summary: z.string().max(5000).optional(),
    skills: z.array(z.unknown()).max(200).optional(),
    languages: z.array(z.unknown()).max(50).optional(),
    links: z.array(z.unknown()).max(50).optional(),
    experience: z.array(z.unknown()).max(100).optional(),
    education: z.array(z.unknown()).max(50).optional(),
    projects: z.array(z.unknown()).max(50).optional(),
    certifications: z.array(z.unknown()).max(50).optional(),
    achievements: z.array(z.unknown()).max(50).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.summary?.trim()) ||
      [
        value.skills,
        value.languages,
        value.links,
        value.experience,
        value.education,
        value.projects,
        value.certifications,
        value.achievements,
      ].some((section) => Array.isArray(section) && section.length > 0),
    { message: "The tailored resume has no content to render." }
  );

/** `Title – For Company` reads better than `Title.pdf` in a downloads list. */
function toFileName(title: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) || "tailored-resume";
  return `${base.replace(/\s+/g, "-").toLowerCase()}.pdf`;
}

export class ResumeTailorDownloadController {
  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // A tailor session still needs a primary resume; this is what carries the
      // contact header the tailored content is rendered under.
      const primary = await resumeService.getPrimaryResume(req.user.id);
      if (!primary) {
        res.status(400).json({
          success: false,
          message: "Upload your resume before downloading a tailored version.",
        });
        return;
      }

      const parsed = tailoredResumeSchema.safeParse(req.body?.tailoredResume ?? req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "A structured tailored resume is required to generate the document.",
        });
        return;
      }

      const tailored = parsed.data;
      const header = primary.document;
      // Contact details come from the stored resume, never from the AI output.
      const document = toResumeDocument(tailored);

      const pdf = renderResumePdf(
        {
          ...document,
          name: header.name,
          email: header.email,
          phone: header.phone,
          location: header.location,
          links: document.links.length ? document.links : header.links,
        },
        tailored.title ?? "tailored-resume"
      );

      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${toFileName(tailored.title ?? "tailored-resume")}"`);
      res.setHeader("Content-Length", String(pdf.length));
      res.end(pdf);
    } catch (error) {
      next(error);
    }
  }
}

export const resumeTailorDownloadController = new ResumeTailorDownloadController();
