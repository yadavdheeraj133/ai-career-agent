import { Router } from "express";

import {
  userPreferencesController,
} from "../controllers/user-preferences.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.get(
  "/",
  authMiddleware,
  userPreferencesController.getPreferences
);

router.post(
  "/",
  authMiddleware,
  userPreferencesController.createPreferences
);

router.patch(
  "/",
  authMiddleware,
  userPreferencesController.updatePreferences
);

export default router;