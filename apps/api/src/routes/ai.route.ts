import { Router } from "express";

import { aiController } from "../controllers/ai.controller.js";

const router:Router = Router();

router.post(
  "/resume/analyze",
  aiController.analyzeResume.bind(aiController)
);

router.post(
  "/resume/ats",
  aiController.analyzeATS.bind(aiController)
);

router.post(
  "/resume/skill-gap",
  aiController.analyzeSkillGap.bind(aiController)
);

router.post(
  "/resume/tailor",
  aiController.tailorResume.bind(aiController)
);

export default router;