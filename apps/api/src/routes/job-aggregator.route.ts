import { Router } from "express";

import {
  jobAggregatorController,
} from "../controllers/job-aggregator.controller.js";

const router: Router = Router();

router.post(
  "/aggregate",
  jobAggregatorController.aggregateJobs
);

export default router;