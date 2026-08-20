import { Router } from "express";

import {
  jobMatchingController,
} from "../controllers/job-matching.controller.js";

const router: Router = Router();

router.post("/match",jobMatchingController.matchJobs);

export default router;