import { Router } from "express";

import {
  jobApplicationController,
} from "../controllers/job-application.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.post(
  "/applications",
  authMiddleware,
  jobApplicationController.createApplication
);

router.get(
  "/applications",
  authMiddleware,
  jobApplicationController.listApplications
);

router.patch(
  "/applications/:id",
  authMiddleware,
  jobApplicationController.updateApplication
);

router.get(
  "/applications/:jobId",
  authMiddleware,
  jobApplicationController.getApplication
);

export default router;