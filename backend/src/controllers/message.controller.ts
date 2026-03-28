import { Response } from "express";
import * as messageService from "../services/message.service";
import { AuthRequest } from "../middleware/auth.middleware";

// SEND MESSAGE
export const sendMessage = async (req: AuthRequest & { params: { chatId: string } }, res: Response) => {
    try {
        const { chatId } = req.params;
        const { content, type } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!content) {
            return res.status(400).json({
                success: false,
                message: "Message content is required",
            });
        }

        const message = await messageService.sendMessage({
            chatId,
            senderId: userId,
            content,
            type: type || "TEXT",
        });

        res.status(201).json({
            success: true,
            data: message,
            message: "Message sent successfully",
        });
    } catch (error: any) {
        if (error.message.includes("Unauthorized")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// GET MESSAGES FROM CHAT
export const getMessages = async (req: AuthRequest & { params: { chatId: string } }, res: Response) => {
    try {
        const { chatId } = req.params;
        const { limit = 50, skip = 0 } = req.query;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const messages = await messageService.getMessages(
            chatId,
            userId,
            parseInt(limit as string) || 50,
            parseInt(skip as string) || 0
        );

        res.status(200).json({
            success: true,
            data: messages,
        });
    } catch (error: any) {
        if (error.message.includes("Unauthorized")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// DELETE MESSAGE
export const deleteMessage = async (req: AuthRequest & { params: { messageId: string } }, res: Response) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const result = await messageService.deleteMessage(messageId, userId);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: any) {
        if (error.message.includes("Unauthorized")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// EDIT MESSAGE
export const editMessage = async (req: AuthRequest & { params: { messageId: string } }, res: Response) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!content) {
            return res.status(400).json({
                success: false,
                message: "Message content is required",
            });
        }

        const message = await messageService.editMessage(
            messageId,
            content,
            userId
        );

        res.status(200).json({
            success: true,
            data: message,
            message: "Message updated successfully",
        });
    } catch (error: any) {
        if (error.message.includes("Unauthorized")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};