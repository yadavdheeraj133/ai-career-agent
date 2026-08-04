import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const router:Router= Router();

router.get("/profile", authMiddleware, userController.getProfile);
router.patch("/profile", authMiddleware, userController.updateProfile);
router.delete("/profile", authMiddleware, userController.deleteProfile);

export default router;