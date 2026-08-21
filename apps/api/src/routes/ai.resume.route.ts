// apps/api/src/routes/ai.resume.route.ts

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

router.post(
  "/ai-verdict",
  aiController.generateAIVerdict.bind(aiController)
);

router.post(
  "/interview-probability",
  aiController.calculateInterviewProbability.bind(aiController)
);

export default router;