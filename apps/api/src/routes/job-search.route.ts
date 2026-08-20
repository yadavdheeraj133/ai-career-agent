import { Router } from "express";

import {
  jobSearchController,
} from "../controllers/job-search.controller.js";

const router: Router = Router();

router.get(
  "/search",
  jobSearchController.searchJobs
);

export default router;