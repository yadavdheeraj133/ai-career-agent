import { Router } from "express";
import { jobController } from "../controllers/jobs.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router:Router = Router();

router.post("/", authMiddleware, jobController.createJob);
router.get("/", authMiddleware, jobController.getAllJobs);
router.get("/:id", authMiddleware, jobController.getJobById);
router.patch("/:id", authMiddleware, jobController.updateJob);
router.delete("/:id", authMiddleware, jobController.deleteJob);

export default router;