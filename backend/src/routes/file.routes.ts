import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middleware/auth.middleware";
import { uploadFile } from "../controllers/file.controller";

const router = Router();

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req: any, _file, cb) => {
        const userId = String(req.user?.userId || "anonymous");
        const userDir = path.resolve(uploadDir, userId);

        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }

        cb(null, userDir);
    },
    filename: (_req, file, cb) => {
        const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${suffix}${ext}`);
    },
});

const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        const allowed = new Set([
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
            "application/pdf",
            "text/plain",
            "application/json",
            "application/zip",
        ]);

        if (!allowed.has(file.mimetype)) {
            cb(new Error("Unsupported file type"));
            return;
        }

        cb(null, true);
    },
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
});

router.use(protect);

router.post("/upload", upload.single("file"), uploadFile);

export default router;
