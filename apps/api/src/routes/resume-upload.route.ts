import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { resumeUploadController } from "../controllers/resume-upload.controller.js";

const router: Router = Router();
const allowedExtensions = new Set([".pdf", ".doc", ".docx"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    callback(null, allowedExtensions.has(extension));
  },
});

function uploadFile(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (error) => {
    if (error) {
      res.status(400).json({ success: false, message: "Upload a valid PDF, DOC, or DOCX file smaller than 10 MB." });
      return;
    }
    next();
  });
}

router.post("/upload", authMiddleware, uploadFile, resumeUploadController.upload);
router.get("/file", authMiddleware, resumeUploadController.download);

export default router;