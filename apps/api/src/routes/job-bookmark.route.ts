import { Router } from "express";

import {
  jobBookmarkController,
} from "../controllers/job-bookmark.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.get(
  "/bookmarks",
  authMiddleware,
  jobBookmarkController.listBookmarks
);

router.post(
  "/:id/bookmark",
  authMiddleware,
  jobBookmarkController.bookmarkJob
);

router.delete(
  "/:id/bookmark",
  authMiddleware,
  jobBookmarkController.removeBookmark
);

export default router;