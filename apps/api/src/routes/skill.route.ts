import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { skillController } from "../controllers/skill.controller.js";

const router: Router = Router();

router.get("/", authMiddleware, skillController.list);
router.post("/", authMiddleware, skillController.add);
router.delete("/:id", authMiddleware, skillController.remove);

export default router;