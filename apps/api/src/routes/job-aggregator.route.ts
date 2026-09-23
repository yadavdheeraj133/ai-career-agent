import { Router } from "express";

import {
  jobAggregatorController,
} from "../controllers/job-aggregator.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.post(
  "/aggregate",
  authMiddleware,
  jobAggregatorController.aggregateJobs
);

export default router;