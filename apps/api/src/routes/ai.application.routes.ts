import { Router } from "express";

import { applicationController } from "../controllers/application.controller.js";

const router: Router = Router();

router.post(
  "/cover-letter",
  applicationController.generateCoverLetter
);

router.post(
  "/application-message",
  applicationController.generateApplicationMessage
);

router.post(
  "/application-answer",
  applicationController.generateApplicationAnswer
);

export default router;