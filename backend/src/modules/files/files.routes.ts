import multer from "multer";
import { Router } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../helpers/async-handler";
import { requireAuth } from "../../middleware/auth";
import { filesController } from "./files.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024
  }
});

export const filesRouter = Router();

filesRouter.use(requireAuth);
filesRouter.post("/upload", upload.single("file"), asyncHandler(filesController.upload));
filesRouter.get("/:fileId/download", asyncHandler(filesController.download));
