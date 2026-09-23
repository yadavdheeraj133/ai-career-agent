import { Request, Response, NextFunction } from "express";
import { skillService } from "../services/skill.service.js";

export class SkillController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const skills = await skillService.getSkills(req.user.id);
      res.status(200).json({ success: true, data: skills });
    } catch (error) {
      next(error);
    }
  }

  async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (typeof req.body.name !== "string") {
        res.status(400).json({ success: false, message: "Skill name is required." });
        return;
      }

      const skill = await skillService.addSkill(req.user.id, req.body.name);
      res.status(201).json({ success: true, data: skill });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (typeof req.params.id !== "string") {
        res.status(400).json({ success: false, message: "Skill id is required." });
        return;
      }

      await skillService.removeSkill(req.user.id, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const skillController = new SkillController();