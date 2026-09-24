import { Router } from "express";
import { jobController } from "../controllers/jobs.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { jobCatalogueAuth } from "../middlewares/job-catalogue.middleware.js";

const router:Router = Router();

router.post("/", authMiddleware, jobCatalogueAuth, jobController.createJob);
router.get("/", authMiddleware, jobController.getAllJobs);
router.get("/:id", authMiddleware, jobController.getJobById);
router.patch("/:id", authMiddleware, jobCatalogueAuth, jobController.updateJob);
router.delete("/:id", authMiddleware, jobCatalogueAuth, jobController.deleteJob);

export default router;