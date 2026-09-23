import { Router } from "express";

import { careerController } from "../controllers/career.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.post(
  "/coach",
  authMiddleware,
  careerController.generateCareerCoach
);

router.post(
  "/roadmap",
  authMiddleware,
  careerController.generateCareerRoadmap
);

router.post(
  "/learning-path",
  authMiddleware,
  careerController.generateLearningPath
);

export default router;