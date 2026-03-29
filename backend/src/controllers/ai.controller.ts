import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { getAvailableModels } from "../services/ai.service";
import { maybeGenerateRoomAiReply } from "../services/message.service";

const unauthorized = (res: Response) =>
    res.status(401).json({
        success: false,
        message: "Unauthorized",
    });

export const listModels = async (_req: AuthRequest, res: Response) => {
    try {
        const data = getAvailableModels();
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const promptAI = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const { chatId, prompt, model } = req.body as {
            chatId: string;
            prompt: string;
            model?: string;
        };

        if (!chatId || !prompt?.trim()) {
            return res.status(400).json({ success: false, message: "chatId and prompt are required" });
        }

        if (prompt.trim().length > 5000) {
            return res.status(400).json({ success: false, message: "Prompt cannot exceed 5000 characters" });
        }

        const triggerPrompt = prompt.trim().toLowerCase().includes("@ai") ? prompt : `@ai ${prompt.trim()}`;
        const data = await maybeGenerateRoomAiReply(chatId, triggerPrompt, req.user.userId, model);

        if (!data) {
            return res.status(400).json({ success: false, message: "AI replies are only supported in SOLO and GROUP chats" });
        }

        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
