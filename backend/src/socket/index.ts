import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { logger } from "../helpers/logger";
import { socketAuth } from "../middleware/socketAuth.middleware";
import { consumeAiQuota, getAiQuotaKey } from "../services/aiQuota.service";
import { sendAiMessage } from "../services/ai/gemini.service";
import {
    addReaction,
    editMessage,
    markMessagesRead,
    sendRoomMessage,
    softDeleteMessage,
} from "../services/message.service";
import { getInsight } from "../services/conversationInsights.service";
import { getRelevantMemories, markMemoriesUsed } from "../services/memory.service";
import { pinMessage, unpinMessage } from "../services/room.service";

interface SocketRateState {
    windowStart: number;
    count: number;
}

const socketRateState = new Map<string, SocketRateState>();
const userSockets = new Map<string, Set<string>>();

const joinRoomSchema = z.object({
    roomId: z.string().uuid(),
});

const sendMessageSchema = z.object({
    roomId: z.string().uuid(),
    content: z.string().min(1).max(6000),
    file: z
        .object({
            fileUrl: z.string().url().optional(),
            fileName: z.string().max(255).optional(),
            fileType: z.string().max(120).optional(),
            fileSize: z.number().int().min(0).max(5 * 1024 * 1024).optional(),
        })
        .optional(),
});

const replyMessageSchema = sendMessageSchema.extend({
    replyTo: z.object({
        messageId: z.string().uuid(),
        snippet: z.string().max(400).optional(),
    }),
});

const typingSchema = z.object({
    roomId: z.string().uuid(),
});

const markReadSchema = z.object({
    roomId: z.string().uuid(),
    messageIds: z.array(z.string().uuid()).min(1).max(200),
});

const editMessageSchema = z.object({
    messageId: z.string().uuid(),
    content: z.string().min(1).max(6000),
});

const deleteMessageSchema = z.object({
    messageId: z.string().uuid(),
});

const pinMessageSchema = z.object({
    roomId: z.string().uuid(),
    messageId: z.string().uuid(),
});

const reactionSchema = z.object({
    messageId: z.string().uuid(),
    emoji: z.string().min(1).max(20),
});

const triggerAiSchema = z.object({
    roomId: z.string().uuid(),
    prompt: z.string().min(1).max(6000),
    modelId: z.string().max(120).optional(),
});

const ensureSocketFloodLimit = (socket: Socket): boolean => {
    const now = Date.now();
    const existing = socketRateState.get(socket.id);

    if (!existing || now - existing.windowStart >= env.socketFloodWindowMs) {
        socketRateState.set(socket.id, {
            windowStart: now,
            count: 1,
        });
        return true;
    }

    existing.count += 1;

    if (existing.count > env.socketFloodMaxEvents) {
        socket.emit("socket_error", {
            code: "SOCKET_FLOOD_LIMIT",
            message: "Too many socket events. Slow down.",
        });

        return false;
    }

    return true;
};

const trackPresence = async (userId: string, online: boolean) => {
    await prisma.user.update({
        where: { id: userId },
        data: {
            onlineStatus: online,
            lastSeen: new Date(),
        },
    });
};

const roomMembershipExists = async (roomId: string, userId: string) => {
    const member = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId,
            },
        },
    });

    return Boolean(member);
};

const parsePayload = <T>(
    socket: Socket,
    schema: z.ZodSchema<T>,
    payload: unknown
): T | null => {
    const result = schema.safeParse(payload);

    if (!result.success) {
        socket.emit("socket_error", {
            code: "VALIDATION_ERROR",
            message: "Invalid event payload",
            details: result.error.issues,
        });
        return null;
    }

    return result.data;
};

const updatePresenceMapsOnConnect = (socket: Socket): void => {
    const userId = socket.data.user.userId as string;
    const existingSockets = userSockets.get(userId) ?? new Set<string>();
    existingSockets.add(socket.id);
    userSockets.set(userId, existingSockets);
};

const updatePresenceMapsOnDisconnect = (socket: Socket): boolean => {
    const userId = socket.data.user.userId as string;
    const existingSockets = userSockets.get(userId);

    if (!existingSockets) {
        return false;
    }

    existingSockets.delete(socket.id);

    if (existingSockets.size === 0) {
        userSockets.delete(userId);
        return true;
    }

    userSockets.set(userId, existingSockets);
    return false;
};

export const initializeSocketServer = (httpServer: HttpServer): Server => {
    const io = new Server(httpServer, {
        cors: {
            origin: env.clientUrl,
            credentials: true,
        },
    });

    io.use(socketAuth);

    io.on("connection", async (socket) => {
        const user = socket.data.user as { userId: string; username: string };

        updatePresenceMapsOnConnect(socket);
        await trackPresence(user.userId, true);

        io.emit("presence_update", {
            userId: user.userId,
            onlineStatus: true,
            lastSeen: new Date().toISOString(),
        });

        socket.on("authenticate", async (ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            ack?.({
                success: true,
                user,
            });
        });

        socket.on("join_room", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, joinRoomSchema, payload);

            if (!parsed) {
                return;
            }

            const canJoin = await roomMembershipExists(parsed.roomId, user.userId);

            if (!canJoin) {
                socket.emit("socket_error", {
                    code: "FORBIDDEN",
                    message: "You are not a member of this room",
                });
                return;
            }

            socket.join(parsed.roomId);
            ack?.({ success: true, roomId: parsed.roomId });
        });

        socket.on("leave_room", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, joinRoomSchema, payload);

            if (!parsed) {
                return;
            }

            socket.leave(parsed.roomId);
            ack?.({ success: true, roomId: parsed.roomId });
        });

        socket.on("typing_start", (payload) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, typingSchema, payload);

            if (!parsed) {
                return;
            }

            socket.to(parsed.roomId).emit("typing_start", {
                roomId: parsed.roomId,
                userId: user.userId,
                username: user.username,
            });
        });

        socket.on("typing_stop", (payload) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, typingSchema, payload);

            if (!parsed) {
                return;
            }

            socket.to(parsed.roomId).emit("typing_stop", {
                roomId: parsed.roomId,
                userId: user.userId,
            });
        });

        socket.on("mark_read", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, markReadSchema, payload);

            if (!parsed) {
                return;
            }

            try {
                const result = await markMessagesRead(user.userId, parsed.roomId, parsed.messageIds);

                io.to(parsed.roomId).emit("messages_read", {
                    roomId: parsed.roomId,
                    userId: user.userId,
                    messageIds: result.updated,
                });

                ack?.({ success: true, data: result });
            } catch (error) {
                logger.warn("mark_read failed", { userId: user.userId, error });
                socket.emit("socket_error", {
                    code: "READ_RECEIPT_FAILED",
                    message: "Could not update read receipts",
                });
            }
        });

        socket.on("send_message", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, sendMessageSchema, payload);

            if (!parsed) {
                return;
            }

            try {
                const message = await sendRoomMessage({
                    roomId: parsed.roomId,
                    userId: user.userId,
                    content: parsed.content,
                    file: parsed.file,
                });

                io.to(parsed.roomId).emit("message_created", message);
                ack?.({ success: true, data: message });
            } catch (error) {
                logger.warn("send_message failed", { userId: user.userId, error });
                socket.emit("socket_error", {
                    code: "SEND_MESSAGE_FAILED",
                    message: "Failed to send message",
                });
            }
        });

        socket.on("reply_message", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, replyMessageSchema, payload);

            if (!parsed) {
                return;
            }

            try {
                const message = await sendRoomMessage({
                    roomId: parsed.roomId,
                    userId: user.userId,
                    content: parsed.content,
                    file: parsed.file,
                    replyTo: parsed.replyTo,
                });

                io.to(parsed.roomId).emit("message_created", message);
                ack?.({ success: true, data: message });
            } catch (error) {
                logger.warn("reply_message failed", { userId: user.userId, error });
                socket.emit("socket_error", {
                    code: "REPLY_MESSAGE_FAILED",
                    message: "Failed to send reply",
                });
            }
        });

        socket.on("trigger_ai", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, triggerAiSchema, payload);

            if (!parsed) {
                return;
            }

            const quota = consumeAiQuota(getAiQuotaKey(user.userId));

            if (!quota.allowed) {
                socket.emit("socket_error", {
                    code: "AI_QUOTA_EXCEEDED",
                    message: "AI quota exceeded",
                    retryAfterMs: quota.retryAfterMs,
                });
                return;
            }

            const isMember = await roomMembershipExists(parsed.roomId, user.userId);

            if (!isMember) {
                socket.emit("socket_error", {
                    code: "FORBIDDEN",
                    message: "You are not a room member",
                });
                return;
            }

            io.to(parsed.roomId).emit("ai_thinking", {
                roomId: parsed.roomId,
                thinking: true,
            });

            try {
                const recentMessages = await prisma.message.findMany({
                    where: {
                        roomId: parsed.roomId,
                        isDeleted: false,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 20,
                });

                const memories = await getRelevantMemories(user.userId, parsed.prompt, 5);
                const memoryIds = memories.map((memory) => memory.id);
                const roomInsight = await getInsight("ROOM", parsed.roomId);

                const history = recentMessages
                    .reverse()
                    .map((message) => ({
                        role: message.isAI ? ("assistant" as const) : ("user" as const),
                        content: `${message.username}: ${message.content}`,
                    }));

                const promptParts = [parsed.prompt];

                if (memories.length > 0) {
                    promptParts.push(
                        `Memories: ${memories.map((memory) => memory.summary).join(" | ")}`
                    );
                }

                if (roomInsight?.summary) {
                    promptParts.push(`Room insight: ${roomInsight.summary}`);
                }

                const aiResponse = await sendAiMessage({
                    task: "chat",
                    message: promptParts.join("\n"),
                    history,
                    modelId: parsed.modelId,
                });

                const savedMessage = await sendRoomMessage({
                    roomId: parsed.roomId,
                    userId: user.userId,
                    content: aiResponse.content,
                    isAI: true,
                    triggeredBy: user.userId,
                    memoryRefs: memoryIds,
                    model: {
                        modelId: aiResponse.model.id,
                        modelProvider: aiResponse.model.provider,
                        telemetry: aiResponse.telemetry,
                    },
                });

                const room = await prisma.room.findUnique({
                    where: {
                        id: parsed.roomId,
                    },
                });

                const aiHistory = Array.isArray(room?.aiHistory) ? room?.aiHistory : [];
                const trimmedHistory = [...(aiHistory as Array<unknown>), {
                    prompt: parsed.prompt,
                    response: aiResponse.content,
                    timestamp: new Date().toISOString(),
                    model: aiResponse.model,
                }].slice(-30);

                await prisma.room.update({
                    where: {
                        id: parsed.roomId,
                    },
                    data: {
                        aiHistory: trimmedHistory as Prisma.InputJsonValue,
                    },
                });

                await markMemoriesUsed(memoryIds);

                io.to(parsed.roomId).emit("message_created", savedMessage);
                ack?.({
                    success: true,
                    data: {
                        message: savedMessage,
                        model: aiResponse.model,
                        usage: aiResponse.usage,
                    },
                });
            } catch (error) {
                logger.warn("trigger_ai failed", {
                    roomId: parsed.roomId,
                    userId: user.userId,
                    error,
                });
                socket.emit("socket_error", {
                    code: "AI_TRIGGER_FAILED",
                    message: "Failed to process AI request",
                });
            } finally {
                io.to(parsed.roomId).emit("ai_thinking", {
                    roomId: parsed.roomId,
                    thinking: false,
                });
            }
        });

        socket.on("edit_message", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, editMessageSchema, payload);

            if (!parsed) {
                return;
            }

            try {
                const message = await editMessage(user.userId, parsed.messageId, parsed.content);
                io.to(message.roomId).emit("message_updated", message);
                ack?.({ success: true, data: message });
            } catch (error) {
                logger.warn("edit_message failed", { userId: user.userId, error });
                socket.emit("socket_error", {
                    code: "EDIT_MESSAGE_FAILED",
                    message: "Failed to edit message",
                });
            }
        });

        socket.on("delete_message", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, deleteMessageSchema, payload);

            if (!parsed) {
                return;
            }

            try {
                const message = await softDeleteMessage(user.userId, parsed.messageId);
                io.to(message.roomId).emit("message_deleted", message);
                ack?.({ success: true, data: message });
            } catch (error) {
                logger.warn("delete_message failed", { userId: user.userId, error });
                socket.emit("socket_error", {
                    code: "DELETE_MESSAGE_FAILED",
                    message: "Failed to delete message",
                });
            }
        });

        socket.on("pin_message", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, pinMessageSchema, payload);

            if (!parsed) {
                return;
            }

            try {
                const message = await pinMessage(user.userId, parsed.roomId, parsed.messageId);
                io.to(parsed.roomId).emit("message_pinned", message);
                ack?.({ success: true, data: message });
            } catch (error) {
                logger.warn("pin_message failed", { userId: user.userId, error });
                socket.emit("socket_error", {
                    code: "PIN_MESSAGE_FAILED",
                    message: "Failed to pin message",
                });
            }
        });

        socket.on("unpin_message", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, pinMessageSchema, payload);

            if (!parsed) {
                return;
            }

            try {
                const message = await unpinMessage(user.userId, parsed.roomId, parsed.messageId);
                io.to(parsed.roomId).emit("message_unpinned", message);
                ack?.({ success: true, data: message });
            } catch (error) {
                logger.warn("unpin_message failed", { userId: user.userId, error });
                socket.emit("socket_error", {
                    code: "UNPIN_MESSAGE_FAILED",
                    message: "Failed to unpin message",
                });
            }
        });

        socket.on("reaction", async (payload, ack?: (payload: unknown) => void) => {
            if (!ensureSocketFloodLimit(socket)) {
                return;
            }

            const parsed = parsePayload(socket, reactionSchema, payload);

            if (!parsed) {
                return;
            }

            try {
                const message = await addReaction(user.userId, parsed.messageId, parsed.emoji);
                io.to(message.roomId).emit("message_reaction", message);
                ack?.({ success: true, data: message });
            } catch (error) {
                logger.warn("reaction event failed", { userId: user.userId, error });
                socket.emit("socket_error", {
                    code: "REACTION_FAILED",
                    message: "Failed to update reaction",
                });
            }
        });

        socket.on("disconnect", async () => {
            socketRateState.delete(socket.id);

            const becameOffline = updatePresenceMapsOnDisconnect(socket);

            if (becameOffline) {
                await trackPresence(user.userId, false);

                io.emit("presence_update", {
                    userId: user.userId,
                    onlineStatus: false,
                    lastSeen: new Date().toISOString(),
                });
            }
        });
    });

    return io;
};
