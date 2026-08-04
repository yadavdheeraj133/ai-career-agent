import { Router } from "express";
import { jobController } from "../controllers/jobs.controller.js";

const router:Router = Router();

router.post("/", jobController.createJob);
router.get("/", jobController.getAllJobs);
router.get("/:id", jobController.getJobById);
router.patch("/:id", jobController.updateJob);
router.delete("/:id", jobController.deleteJob);

export default router;