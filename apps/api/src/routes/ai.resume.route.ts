import { Router } from "express";

import { aiController } from "../controllers/ai.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.post(
  "/analyze",
  authMiddleware,
  aiController.analyzeResume.bind(aiController)
);

router.post(
  "/ats",
  authMiddleware,
  aiController.analyzeATS.bind(aiController)
);

router.post(
  "/skill-gap",
  authMiddleware,
  aiController.analyzeSkillGap.bind(aiController)
);

router.post(
  "/tailor",
  authMiddleware,
  aiController.tailorResume.bind(aiController)
);

router.post(
  "/job-match",
  authMiddleware,
  aiController.matchResumeWithJob.bind(aiController)
);

router.post(
  "/ai-verdict",
  authMiddleware,
  aiController.generateAIVerdict.bind(aiController)
);

router.post(
  "/interview-probability",
  authMiddleware,
  aiController.calculateInterviewProbability.bind(aiController)
);

export default router;