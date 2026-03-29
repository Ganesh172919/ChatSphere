import { Prisma, RoomMemberRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../helpers/errors";

const toJson = (value: unknown): Prisma.InputJsonValue => {
    return value as Prisma.InputJsonValue;
};

const parseJsonArray = <T>(value: unknown): T[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value as T[];
};

const parseReactions = (value: unknown): Record<string, string[]> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    const output: Record<string, string[]> = {};

    for (const [emoji, users] of Object.entries(value as Record<string, unknown>)) {
        output[emoji] = Array.isArray(users)
            ? users.map((entry) => String(entry))
            : [];
    }

    return output;
};

const assertRoomMembership = async (userId: string, roomId: string) => {
    const member = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId,
            },
        },
    });

    if (!member) {
        throw new AppError("Not a room member", 403, "FORBIDDEN");
    }

    return member;
};

const ensureNoBlockRelation = async (actorId: string, targetId: string) => {
    const blocked = await prisma.userBlock.findFirst({
        where: {
            OR: [
                {
                    blockerId: actorId,
                    blockedId: targetId,
                },
                {
                    blockerId: targetId,
                    blockedId: actorId,
                },
            ],
        },
    });

    if (blocked) {
        throw new AppError("Message blocked due to user block relationship", 403, "FORBIDDEN");
    }
};

export const sendRoomMessage = async (payload: {
    roomId: string;
    userId: string;
    content: string;
    isAI?: boolean;
    triggeredBy?: string;
    replyTo?: { messageId: string; snippet?: string };
    file?: {
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
    };
    memoryRefs?: string[];
    model?: {
        modelId?: string;
        modelProvider?: string;
        telemetry?: Record<string, unknown>;
    };
}) => {
    const content = payload.content.trim();

    if (content.length === 0) {
        throw new AppError("Message content is required", 400, "VALIDATION_ERROR");
    }

    if (content.length > 6000) {
        throw new AppError("Message exceeds maximum length", 400, "VALIDATION_ERROR");
    }

    const member = await assertRoomMembership(payload.userId, payload.roomId);

    if (payload.replyTo?.messageId) {
        const repliedMessage = await prisma.message.findUnique({
            where: {
                id: payload.replyTo.messageId,
            },
            select: {
                id: true,
                userId: true,
                content: true,
            },
        });

        if (!repliedMessage) {
            throw new AppError("Reply target not found", 404, "NOT_FOUND");
        }

        await ensureNoBlockRelation(payload.userId, repliedMessage.userId);
    }

    const user = await prisma.user.findUnique({
        where: {
            id: payload.userId,
        },
        select: {
            username: true,
            displayName: true,
        },
    });

    if (!user) {
        throw new AppError("User not found", 404, "NOT_FOUND");
    }

    const message = await prisma.message.create({
        data: {
            roomId: payload.roomId,
            userId: payload.userId,
            username: user.displayName || user.username,
            content,
            isAI: Boolean(payload.isAI),
            triggeredBy: payload.triggeredBy,
            replyTo: payload.replyTo ? toJson(payload.replyTo) : undefined,
            status: "SENT",
            readBy: toJson([payload.userId]),
            fileUrl: payload.file?.fileUrl,
            fileName: payload.file?.fileName,
            fileType: payload.file?.fileType,
            fileSize: payload.file?.fileSize,
            memoryRefs: toJson(payload.memoryRefs ?? []),
            modelId: payload.model?.modelId,
            modelProvider: payload.model?.modelProvider,
            modelTelemetry: payload.model?.telemetry
                ? toJson(payload.model.telemetry)
                : undefined,
        },
    });

    await prisma.room.update({
        where: {
            id: payload.roomId,
        },
        data: {
            updatedAt: new Date(),
        },
    });

    return {
        ...message,
        senderRole: member.role,
    };
};

export const getRoomMessages = async (
    userId: string,
    roomId: string,
    limit = 50,
    skip = 0
) => {
    await assertRoomMembership(userId, roomId);

    const boundedLimit = Math.max(1, Math.min(limit, 100));

    const messages = await prisma.message.findMany({
        where: {
            roomId,
            isDeleted: false,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: boundedLimit,
        skip,
    });

    return {
        total: messages.length,
        messages: messages.reverse(),
    };
};

export const markMessagesRead = async (
    userId: string,
    roomId: string,
    messageIds: string[]
) => {
    await assertRoomMembership(userId, roomId);

    const messages = await prisma.message.findMany({
        where: {
            id: {
                in: messageIds,
            },
            roomId,
        },
    });

    for (const message of messages) {
        const readBy = new Set(parseJsonArray<string>(message.readBy));
        readBy.add(userId);

        await prisma.message.update({
            where: {
                id: message.id,
            },
            data: {
                readBy: toJson(Array.from(readBy)),
                status: "READ",
            },
        });
    }

    return {
        updated: messages.map((message) => message.id),
    };
};

export const addReaction = async (
    userId: string,
    messageId: string,
    emoji: string
) => {
    const message = await prisma.message.findUnique({
        where: {
            id: messageId,
        },
    });

    if (!message) {
        throw new AppError("Message not found", 404, "NOT_FOUND");
    }

    await assertRoomMembership(userId, message.roomId);

    const reactions = parseReactions(message.reactions);
    const users = new Set(reactions[emoji] ?? []);

    if (users.has(userId)) {
        users.delete(userId);
    } else {
        users.add(userId);
    }

    reactions[emoji] = Array.from(users);

    return prisma.message.update({
        where: {
            id: message.id,
        },
        data: {
            reactions: toJson(reactions),
        },
    });
};

export const editMessage = async (
    userId: string,
    messageId: string,
    content: string
) => {
    const message = await prisma.message.findUnique({
        where: {
            id: messageId,
        },
    });

    if (!message || message.isDeleted) {
        throw new AppError("Message not found", 404, "NOT_FOUND");
    }

    if (message.userId !== userId) {
        throw new AppError("Only message owner can edit this message", 403, "FORBIDDEN");
    }

    const ageMs = Date.now() - message.createdAt.getTime();
    const maxAgeMs = env.messageEditWindowMinutes * 60 * 1000;

    if (ageMs > maxAgeMs) {
        throw new AppError("Message edit window has expired", 400, "EDIT_WINDOW_EXPIRED");
    }

    return prisma.message.update({
        where: {
            id: message.id,
        },
        data: {
            content: content.trim(),
            isEdited: true,
            editedAt: new Date(),
        },
    });
};

export const softDeleteMessage = async (userId: string, messageId: string) => {
    const message = await prisma.message.findUnique({
        where: {
            id: messageId,
        },
    });

    if (!message) {
        throw new AppError("Message not found", 404, "NOT_FOUND");
    }

    const membership = await assertRoomMembership(userId, message.roomId);

    const isOwner = message.userId === userId;
    const isModerator =
        membership.role === RoomMemberRole.ADMIN || membership.role === RoomMemberRole.MODERATOR;

    if (!isOwner && !isModerator) {
        throw new AppError("Not allowed to delete this message", 403, "FORBIDDEN");
    }

    return prisma.message.update({
        where: {
            id: message.id,
        },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
            content: "[deleted]",
        },
    });
};
