import { Router } from "express";

import { notificationController } from "../controllers/notifications.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.get("/", authMiddleware, notificationController.list);

router.delete("/", authMiddleware, notificationController.deleteAll);

router.post(
  "/read-all",
  authMiddleware,
  notificationController.markAllRead
);

router.patch(
  "/:id/read",
  authMiddleware,
  notificationController.markRead
);

export default router;
