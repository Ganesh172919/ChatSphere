import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as insightService from "../services/insight.service";

const unauthorized = (res: Response) =>
    res.status(401).json({
        success: false,
        message: "Unauthorized",
    });

export const getInsights = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const chatId = String(req.params.chatId);
        const data = await insightService.getInsights(chatId, req.user.userId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const generateInsights = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const chatId = String(req.params.chatId);
        const data = await insightService.generateInsights(chatId, req.user.userId);
        return res.status(201).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
