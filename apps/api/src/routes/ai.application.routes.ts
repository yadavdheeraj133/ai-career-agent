import { Router } from "express";

import { applicationController } from "../controllers/application.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const router: Router = Router();

router.post(
  "/cover-letter",
  authMiddleware,
  applicationController.generateCoverLetter
);

router.post(
  "/application-message",
  authMiddleware,
  applicationController.generateApplicationMessage
);

router.post(
  "/application-answer",
  authMiddleware,
  applicationController.generateApplicationAnswer
);

export default router;