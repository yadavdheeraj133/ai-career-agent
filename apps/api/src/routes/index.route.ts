import skillRoutes from "../routes/skill.route.js";
import resumeUploadRoutes from "../routes/resume-upload.route.js";
import { Router } from "express";
import authRoutes from "../routes/auth.routes.js";
import { errorHandler } from "../middlewares/error.middleware.js";
import userRoutes  from "./user.route.js";
import resumeRoutes from "./resume.route.js";
import jobRouter from "./jobs.route.js";
import aiRoutes from "./ai.resume.route.js";
import applicationRoutes from "./ai.application.routes.js";
import interviewRoutes from "./ai.interview.routes.js";
import careerRoutes from "./ai.career.routes.js";
import jobAggregatorRoutes from "./job-aggregator.route.js";
import jobSearchRoutes from "./job-search.route.js";
import jobMatchingRoutes from "./job-matching.route.js";
import jobBookmarkRoutes from "./job-bookmark.route.js";
import jobApplicationRoutes from "./job-application.route.js";
import userPreferencesRoutes from "./user-preference.routes.js";
import userSettingsRoutes from "./user-settings.route.js";
import dashboardRoutes from "./dashboard.route.js";
import notificationRoutes from "./notifications.route.js";

const router:Router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/resume",resumeRoutes);
router.use("/jobs", jobRouter);
router.use("/api/resume", aiRoutes);
router.use("/api/application", applicationRoutes);
router.use("/api/interview", interviewRoutes);
router.use("/api/career", careerRoutes);
router.use("/api/jobs", jobAggregatorRoutes);
router.use("/api/jobs", jobSearchRoutes);
router.use("/api/jobs", jobMatchingRoutes);
router.use("/api/jobs", jobBookmarkRoutes);
router.use("/api/jobs", jobApplicationRoutes);
router.use("/api/preferences",userPreferencesRoutes);
router.use("/users/settings",userSettingsRoutes);
router.use("/api/dashboard",dashboardRoutes);
router.use("/api/notifications",notificationRoutes);
router.use("/api/skills", skillRoutes);
router.use("/resume", resumeUploadRoutes);
// Error handler should be last
router.use(errorHandler);

export default router;