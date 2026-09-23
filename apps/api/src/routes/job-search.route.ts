import { Router } from "express";

import {jobSearchController,} from "../controllers/job-search.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const router: Router = Router();

router.get(
  "/search",
  authMiddleware,
  jobSearchController.searchJobs
);

export default router;