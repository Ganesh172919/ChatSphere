import { Response } from "express";
import * as messageService from "../services/message.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { getIO } from "../lib/socket";

// SEND MESSAGE
export const sendMessage = async (req: AuthRequest & { params: { chatId: string } }, res: Response) => {
    try {
        const { chatId } = req.params;
        const {
            content,
            type,
            parentMessageId,
            metadata,
            poll,
            modelUsed,
            requestAiReply,
        } = req.body;
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
            parentMessageId,
            metadata,
            poll,
            modelUsed,
        });

        try {
            getIO().to(chatId).emit("message:new", message);
        } catch {
            // Socket server might not be initialized in tests.
        }

        let aiMessage = null;
        let aiWarning: string | null = null;
        if (requestAiReply || (typeof content === "string" && /(^|\s)@ai(\b|\s|[.,!?;:])/i.test(content))) {
            try {
                aiMessage = await messageService.maybeGenerateRoomAiReply(
                    chatId,
                    content,
                    userId,
                    modelUsed,
                    { force: Boolean(requestAiReply) }
                );

                if (aiMessage) {
                    try {
                        getIO().to(chatId).emit("message:new", aiMessage);
                    } catch {
                        // Socket server might not be initialized in tests.
                    }
                }
            } catch (error: any) {
                aiWarning = error?.message || "AI reply could not be generated";
            }
        }

        res.status(201).json({
            success: true,
            data: {
                message,
                aiMessage,
                aiWarning,
            },
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
            Number(limit as string),
            Number(skip as string)
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

        try {
            getIO().to(result.chatId).emit("message:deleted", {
                messageId: result.messageId,
                chatId: result.chatId,
            });
        } catch {
            // Socket server might not be initialized in tests.
        }

        res.status(200).json({
            success: true,
            data: result,
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

        try {
            getIO()
                .to((message as { chatId: string }).chatId)
                .emit("message:updated", message);
        } catch {
            // Socket server might not be initialized in tests.
        }

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

// REACT TO MESSAGE
export const reactToMessage = async (
    req: AuthRequest & { params: { messageId: string } },
    res: Response
) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body as { emoji: string };
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await messageService.toggleReaction(messageId, userId, emoji);

        try {
            getIO().to(result.message.chatId).emit("message:updated", result.message);
        } catch {
            // Socket server might not be initialized in tests.
        }

        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// PIN / UNPIN MESSAGE
export const pinMessage = async (
    req: AuthRequest & { params: { messageId: string } },
    res: Response
) => {
    try {
        const { messageId } = req.params;
        const { pinned } = req.body as { pinned: boolean };
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await messageService.pinMessage(messageId, userId, Boolean(pinned));

        try {
            getIO().to(result.chatId).emit("message:updated", result);
        } catch {
            // Socket server might not be initialized in tests.
        }

        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// VOTE POLL
export const votePoll = async (
    req: AuthRequest & { params: { messageId: string } },
    res: Response
) => {
    try {
        const { messageId } = req.params;
        const { optionId } = req.body as { optionId: string };
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await messageService.votePoll(messageId, userId, optionId);

        try {
            getIO().to(result.message.chatId).emit("message:updated", result.message);
        } catch {
            // Socket server might not be initialized in tests.
        }

        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// REPORT MESSAGE
export const reportMessage = async (
    req: AuthRequest & { params: { messageId: string } },
    res: Response
) => {
    try {
        const { messageId } = req.params;
        const { reason } = req.body as { reason: string };
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await messageService.reportMessage(messageId, userId, reason || "No reason provided");
        return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
