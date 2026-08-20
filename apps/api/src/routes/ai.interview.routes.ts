import { Router } from "express";

import { interviewController } from "../controllers/interview.controller.js";

const router: Router = Router();

router.post(
  "/prepare",
  interviewController.prepareInterview
);

router.post(
  "/job-summary",
  interviewController.generateJobSummary
);

router.post(
  "/company-insight",
  interviewController.generateCompanyInsight
);

export default router;