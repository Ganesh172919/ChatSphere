import fs from "fs";
import { Router } from "express";
import { asyncHandler } from "../helpers/asyncHandler";
import { AppError } from "../helpers/errors";
import { env } from "../config/env";
import { protect } from "../middleware/auth.middleware";
import { resolveUploadPath, uploadSingle } from "../middleware/upload.middleware";

const router = Router();

router.post("/", protect, (req, res, next) => {
    uploadSingle(req, res, (error) => {
        if (error) {
            next(error);
            return;
        }

        if (!req.file) {
            next(new AppError("No file uploaded", 400, "VALIDATION_ERROR"));
            return;
        }

        const fileUrl = `${env.serverUrl}/api/uploads/${req.file.filename}`;

        res.status(201).json({
            success: true,
            data: {
                fileUrl,
                fileName: req.file.filename,
                originalName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
            },
            message: "Upload successful",
        });
    });
});

router.get(
    "/:filename",
    asyncHandler(async (req, res) => {
        const filename = String(req.params.filename);
        const filePath = resolveUploadPath(filename);

        if (!fs.existsSync(filePath)) {
            throw new AppError("File not found", 404, "NOT_FOUND");
        }

        res.sendFile(filePath);
    })
);

export default router;
