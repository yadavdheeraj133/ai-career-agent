import { Router } from "express";

import { interviewController } from "../controllers/interview.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.post(
  "/prepare",
  authMiddleware,
  interviewController.prepareInterview
);

router.post(
  "/job-summary",
  authMiddleware,
  interviewController.generateJobSummary
);

router.post(
  "/company-insight",
  authMiddleware,
  interviewController.generateCompanyInsight
);

export default router;