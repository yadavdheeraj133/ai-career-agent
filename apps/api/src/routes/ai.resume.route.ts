import { Router } from "express";

import { aiController } from "../controllers/ai.controller.js";

const router: Router = Router();

router.post(
  "/analyze",
  aiController.analyzeResume.bind(aiController)
);

router.post(
  "/ats",
  aiController.analyzeATS.bind(aiController)
);

router.post(
  "/skill-gap",
  aiController.analyzeSkillGap.bind(aiController)
);

router.post(
  "/tailor",
  aiController.tailorResume.bind(aiController)
);

router.post(
  "/job-match",
  aiController.matchResumeWithJob.bind(aiController)
);

export default router;