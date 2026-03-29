import fs from "fs";
import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import { AppError } from "../helpers/errors";

const ALLOWED_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".pdf",
    ".txt",
    ".md",
    ".csv",
    ".json",
    ".xml",
    ".js",
    ".ts",
]);

fs.mkdirSync(env.uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, env.uploadDirectory);
    },
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `${randomUUID()}${extension}`);
    },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
        callback(
            new AppError(
                "Unsupported file type. Allowed: jpg png gif webp pdf txt md csv json xml js ts",
                400,
                "UNSUPPORTED_FILE_TYPE"
            )
        );
        return;
    }

    callback(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: env.uploadMaxSizeBytes,
    },
});

export const uploadSingle = upload.single("file");

export const resolveUploadPath = (filename: string): string => {
    const safeName = path.basename(filename);

    if (safeName !== filename) {
        throw new AppError("Invalid file name", 400, "INVALID_FILE_NAME");
    }

    return path.join(env.uploadDirectory, safeName);
};
