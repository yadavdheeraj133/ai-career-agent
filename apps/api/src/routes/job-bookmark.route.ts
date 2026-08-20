import { Router } from "express";

import {
  jobBookmarkController,
} from "../controllers/job-bookmark.controller.js";

const router: Router = Router();

router.post(
  "/:id/bookmark",
  jobBookmarkController.bookmarkJob
);

router.delete(
  "/:id/bookmark",
  jobBookmarkController.removeBookmark
);

export default router;