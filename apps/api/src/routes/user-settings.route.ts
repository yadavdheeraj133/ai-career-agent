import { Router } from "express";

import {
  userSettingsController,
} from "../controllers/user-settings.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.get(
  "/",
  authMiddleware,
  userSettingsController.getSettings
);

router.post(
  "/",
  authMiddleware,
  userSettingsController.createSettings
);

router.patch(
  "/",
  authMiddleware,
  userSettingsController.updateSettings
);

export default router;