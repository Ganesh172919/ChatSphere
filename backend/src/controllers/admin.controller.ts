import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as adminService from "../services/admin.service";

type ModerationStatus = "OPEN" | "RESOLVED" | "DISMISSED";

const unauthorized = (res: Response) =>
    res.status(401).json({
        success: false,
        message: "Unauthorized",
    });

export const analytics = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const data = await adminService.analytics();
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const listFlags = async (req: AuthRequest, res: Response) => {
    try {
        const rawStatus = req.query.status;
        const status =
            typeof rawStatus === "string"
                ? (rawStatus as ModerationStatus)
                : undefined;
        const data = await adminService.getFlags(status);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const updateFlag = async (req: AuthRequest, res: Response) => {
    try {
        const status = req.body.status as ModerationStatus;
        const flagId = String(req.params.flagId);
        if (!["OPEN", "RESOLVED", "DISMISSED"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const data = await adminService.updateFlag(flagId, status);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const listPrompts = async (_req: AuthRequest, res: Response) => {
    try {
        const data = await adminService.listPromptTemplates();
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createPrompt = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const data = await adminService.createPromptTemplate(req.user.userId, req.body);
        return res.status(201).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const updatePrompt = async (req: AuthRequest, res: Response) => {
    try {
        const promptId = String(req.params.promptId);
        const data = await adminService.updatePromptTemplate(promptId, req.body);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deletePrompt = async (req: AuthRequest, res: Response) => {
    try {
        const promptId = String(req.params.promptId);
        const data = await adminService.deletePromptTemplate(promptId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const targetUserId = String(req.params.userId);
        const data = await adminService.blockUser(req.user.userId, targetUserId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const targetUserId = String(req.params.userId);
        const data = await adminService.unblockUser(req.user.userId, targetUserId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const listBlocks = async (req: AuthRequest, res: Response) => {
    try {
        const onlyMine = req.query.mine === "true";
        const data = await adminService.listBlocks(onlyMine ? req.user?.userId : undefined);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
