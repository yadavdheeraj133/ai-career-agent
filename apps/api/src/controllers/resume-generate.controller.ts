import { Request, Response, NextFunction } from "express";
import { z } from "zod";

import { hasResumeContent } from "../services/resume-document.service.js";
import { renderResumePdf } from "../services/resume-pdf.service.js";
import { resumeService } from "../services/resume.service.js";
import {
  applyResumeTemplate,
  getResumeTemplate,
  pickRandomResumeTemplate,
  publicTemplate,
  type ResumeTemplate,
} from "../services/resume-template.service.js";

/**
 * Non-tailored resume generation.
 *
 * This is a layout service, not a writing one. The candidate's stored resume is
 * the only content: a request picks one approved template from the pool, applies
 * its section order to the user's own document and returns it. Nothing is
 * persisted, nothing is invented and the uploaded resume is never rewritten, so
 * the primary resume stays the single source of truth and the tailored flow is
 * untouched.
 */

const templateRequestSchema = z.object({
  templateId: z.string().min(1).max(80).optional(),
});

const NO_RESUME =
  "Upload your resume before generating a resume from it.";
const UNKNOWN_TEMPLATE =
  "That resume template is not available. Generate again to pick another one.";

/** `Doe Resume – Classic Professional` reads better than a bare `resume.pdf`. */
function toFileName(title: string, template: ResumeTemplate): string {
  const base =
    title.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "resume";
  return `${base.replace(/\s+/g, "-").toLowerCase()}-${template.id}.pdf`;
}

export class ResumeGenerateController {
  /**
   * Picks a template (the caller's choice, or a uniformly random one) and
   * returns it alongside the user's own resume laid out in that template.
   */
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = templateRequestSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ success: false, message: UNKNOWN_TEMPLATE });
        return;
      }

      const primary = await resumeService.getPrimaryResume(req.user.id);
      if (!primary || !hasResumeContent(primary.document)) {
        res.status(400).json({ success: false, message: NO_RESUME });
        return;
      }

      const requested = getResumeTemplate(parsed.data.templateId);
      if (parsed.data.templateId && !requested) {
        res.status(400).json({ success: false, message: UNKNOWN_TEMPLATE });
        return;
      }

      const template = requested ?? pickRandomResumeTemplate();

      res.status(200).json({
        success: true,
        message: "Resume generated.",
        data: {
          template: publicTemplate(template),
          document: applyResumeTemplate(primary.document, template),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Renders the same generation as a real PDF. The template id is echoed back
   * by the client so the download matches what is on screen; contact details
   * and every fact still come from the stored resume.
   */
  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = templateRequestSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ success: false, message: UNKNOWN_TEMPLATE });
        return;
      }

      const primary = await resumeService.getPrimaryResume(req.user.id);
      if (!primary || !hasResumeContent(primary.document)) {
        res.status(400).json({ success: false, message: NO_RESUME });
        return;
      }

      const requested = getResumeTemplate(parsed.data.templateId);
      if (parsed.data.templateId && !requested) {
        res.status(400).json({ success: false, message: UNKNOWN_TEMPLATE });
        return;
      }

      const template = requested ?? pickRandomResumeTemplate();
      const document = applyResumeTemplate(primary.document, template);
      const pdf = renderResumePdf(document, document.title, template);

      res.status(200);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${toFileName(document.title, template)}"`
      );
      res.setHeader("Content-Length", String(pdf.length));
      res.end(pdf);
    } catch (error) {
      next(error);
    }
  }
}

export const resumeGenerateController = new ResumeGenerateController();
