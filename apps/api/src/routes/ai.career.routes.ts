import { Router } from "express";

import { careerController } from "../controllers/career.controller.js";

const router: Router = Router();

router.post(
  "/coach",
  careerController.generateCareerCoach
);

router.post(
  "/roadmap",
  careerController.generateCareerRoadmap
);

router.post(
  "/learning-path",
  careerController.generateLearningPath
);

export default router;