import { getCurrentUser } from './../controllers/index.controller.js';
import { Router } from "express";
import { register, login, forgotPassword, resetPassword } from "../controllers/index.controller.js";
import { linkedinAuth, linkedinCallback } from "../controllers/linkedin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";


const router:Router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// LinkedIn OAuth
router.get("/linkedin", linkedinAuth);
router.get("/linkedin/callback", linkedinCallback);


router.get("/me", authMiddleware, getCurrentUser);


export default router;