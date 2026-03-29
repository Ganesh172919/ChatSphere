import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import path from "path";

export const uploadFile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
            });
        }

        const base = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;
        const uploadRoot = path.resolve(process.cwd(), "uploads");
        const relativePath = path
            .relative(uploadRoot, file.path)
            .split(path.sep)
            .map((segment) => encodeURIComponent(segment))
            .join("/");
        const fileUrl = `${base}/uploads/${relativePath}`;

        return res.status(201).json({
            success: true,
            data: {
                url: fileUrl,
                fileKey: relativePath,
                fileName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
            },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
