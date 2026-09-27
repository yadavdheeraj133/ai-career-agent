import { Router } from "express";
import { resumeController } from "../controllers/resume.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router:Router = Router();

router.post("/", authMiddleware, resumeController.createResume);
router.get("/", authMiddleware, resumeController.getResume);
// Canonical structured resume for the viewer and the AI tools.
router.get("/document", authMiddleware, resumeController.getResumeDocument);
router.patch("/", authMiddleware, resumeController.updateResume);
router.delete("/", authMiddleware, resumeController.deleteResume);

export default router;