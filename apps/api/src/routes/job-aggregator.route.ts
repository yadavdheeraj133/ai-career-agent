import { Router } from "express";

import {
  jobAggregatorController,
} from "../controllers/job-aggregator.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { jobCatalogueAuth } from "../middlewares/job-catalogue.middleware.js";

const router: Router = Router();

router.post(
  "/aggregate",
  authMiddleware,
  jobCatalogueAuth,
  jobAggregatorController.aggregateJobs
);

export default router;