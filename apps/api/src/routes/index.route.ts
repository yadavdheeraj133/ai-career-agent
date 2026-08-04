import { Router } from "express";
import authRoutes from "../routes/auth.routes.js";
import { errorHandler } from "../middlewares/error.middleware.js";
import userRoutes  from "./user.route.js";
import resumeRoutes from "./resume.route.js";
import jobRouter from "./jobs.route.js";
import aiRoutes from "./ai.route.js";

const router:Router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/resume",resumeRoutes);
router.use("/jobs", jobRouter);
router.use("/api/ai", aiRoutes);

// Error handler should be last
router.use(errorHandler);

export default router;