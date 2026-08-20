import { Router } from "express";

import {
  jobApplicationController,
} from "../controllers/job-application.controller.js";

const router: Router = Router();

router.post(
  "/applications",
  jobApplicationController.createApplication
);

router.get(
  "/applications/:jobId",
  jobApplicationController.getApplication
);

export default router;