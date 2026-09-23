import { Router } from "express";

import {jobMatchingController,} from "../controllers/job-matching.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.post("/match", authMiddleware, jobMatchingController.matchJobs);

export default router;