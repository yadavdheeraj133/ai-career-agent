import { getCurrentUser } from './../controllers/index.controller.js';
import { Router } from "express";
import { register, login } from "../controllers/index.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";


const router:Router = Router();

router.post("/register", register);
router.post("/login", login);


router.get("/me", authMiddleware, getCurrentUser);


export default router;