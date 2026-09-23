import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router: Router = Router();

router.get(
  "/",
  authMiddleware,
  dashboardController.getSummary
);

export default router;
