import { prisma } from "../lib/prisma";
import { ensureChatAccess } from "./chat.service";
import { generateAIResponse } from "./ai.service";
import { getActivePromptTemplates } from "./admin.service";

type MessageType = "TEXT" | "AI" | "FILE" | "SYSTEM";

const getEditWindowMinutes = () => {
    const value = Number(process.env.MESSAGE_EDIT_WINDOW_MINUTES || "15");
    return Number.isFinite(value) && value > 0 ? value : 15;
};

const isChatAdmin = async (chatId: string, userId: string) => {
    const membership = await prisma.chatMember.findUnique({
        where: {
            userId_chatId: {
                userId,
                chatId,
            },
        },
    });

    return membership?.role === "ADMIN";
};

const sanitizeContent = (value: string) => value.trim();

const shouldMentionAi = (content: string) => /(^|\s)@ai(\b|\s|[.,!?;:])/i.test(content);

const extractAiPrompt = (content: string) => {
    const trimmed = content.replace(/@ai/gi, "").trim();
    return trimmed || content.trim();
};

const getBlockedUserIds = async (userId: string) => {
    const blocks = await prisma.userBlock.findMany({
        where: {
            blockerId: userId,
        },
        select: {
            blockedId: true,
        },
    });

    return new Set(blocks.map((item) => item.blockedId));
};

const serializeMetadata = (value?: Record<string, unknown> | string) => {
    if (typeof value === "string") {
        return value;
    }
    if (!value) {
        return undefined;
    }
    return JSON.stringify(value);
};

const parseMetadata = (value?: string | null) => {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

const normalizeMessage = (message: {
    id: string;
    content: string;
    type: string;
    chatId: string;
    senderId: string;
    createdAt: Date;
    editedAt: Date | null;
    modelUsed: string | null;
    metadata: string | null;
    parentMessageId: string | null;
    isPinned: boolean;
    sender: {
        id: string;
        name: string | null;
        email: string;
    };
    reactions?: Array<{
        id: string;
        emoji: string;
        userId: string;
    }>;
    poll?: {
        id: string;
        question: string;
        allowMulti: boolean;
        closesAt: Date | null;
        options: Array<{
            id: string;
            text: string;
            order: number;
            votes: Array<{
                voterId: string;
            }>;
        }>;
    } | null;
}) => ({
    id: message.id,
    content: message.content,
    type: message.type,
    chatId: message.chatId,
    senderId: message.sender.id,
    senderName: message.sender.name,
    senderEmail: message.sender.email,
    parentMessageId: message.parentMessageId,
    metadata: parseMetadata(message.metadata),
    modelUsed: message.modelUsed,
    editedAt: message.editedAt,
    isPinned: message.isPinned,
    reactions: message.reactions || [],
    poll: message.poll
        ? {
              id: message.poll.id,
              question: message.poll.question,
              allowMulti: message.poll.allowMulti,
              closesAt: message.poll.closesAt,
              options: message.poll.options.map((option) => ({
                  id: option.id,
                  text: option.text,
                  order: option.order,
                  votes: option.votes.length,
                  voters: option.votes.map((vote) => vote.voterId),
              })),
          }
        : null,
    createdAt: message.createdAt,
});

const getNormalizedMessageById = async (messageId: string) => {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            reactions: true,
            poll: {
                include: {
                    options: {
                        include: {
                            votes: {
                                select: {
                                    voterId: true,
                                },
                            },
                        },
                        orderBy: { order: "asc" },
                    },
                },
            },
        },
    });

    if (!message) {
        throw new Error("Message not found");
    }

    return normalizeMessage(message);
};

const buildAiSystemPrompt = async (chatType: string) => {
    const basePrompt =
        chatType === "GROUP"
            ? "You are the room assistant. Keep answers concise, practical, and aware of group context."
            : "You are a helpful AI assistant in a solo chat.";

    const templates = await getActivePromptTemplates(chatType);
    if (!templates.length) {
        return basePrompt;
    }

    return `${basePrompt}\n\nActive admin prompt templates:\n${templates
        .map((template, index) => `${index + 1}. ${template.title}: ${template.content}`)
        .join("\n")}`;
};

export const sendMessage = async (data: {
    chatId: string;
    senderId: string;
    content: string;
    type?: MessageType;
    parentMessageId?: string;
    metadata?: Record<string, unknown> | string;
    modelUsed?: string;
    poll?: {
        question: string;
        allowMulti?: boolean;
        closesAt?: string;
        options: string[];
    };
}) => {
    const {
        chatId,
        senderId,
        content,
        type = "TEXT",
        parentMessageId,
        metadata,
        modelUsed,
        poll,
    } = data;

    const normalizedContent = sanitizeContent(content);
    if (!normalizedContent) {
        throw new Error("Message content is required");
    }

    if (normalizedContent.length > 5000) {
        throw new Error("Message cannot exceed 5000 characters");
    }

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            members: {
                select: {
                    userId: true,
                },
            },
        },
    });
    if (!chat) {
        throw new Error("Chat not found");
    }

    await ensureChatAccess(chatId, senderId);

    if (chat.type === "DIRECT") {
        const otherMember = chat.members.find((member) => member.userId !== senderId);
        if (otherMember) {
            const block = await prisma.userBlock.findFirst({
                where: {
                    OR: [
                        { blockerId: senderId, blockedId: otherMember.userId },
                        { blockerId: otherMember.userId, blockedId: senderId },
                    ],
                },
            });

            if (block) {
                throw new Error("Messaging is blocked for this direct chat");
            }
        }
    }

    if (parentMessageId) {
        const parent = await prisma.message.findUnique({ where: { id: parentMessageId } });
        if (!parent || parent.chatId !== chatId) {
            throw new Error("Reply target not found in this chat");
        }
    }

    const pollQuestion = poll?.question?.trim() || "";
    const pollOptions = (poll?.options || []).map((option) => option.trim()).filter(Boolean);
    const uniquePollOptions = [...new Set(pollOptions)];

    if (poll && (pollQuestion || pollOptions.length > 0) && uniquePollOptions.length < 2) {
        throw new Error("Poll requires at least two unique options");
    }

    let closesAt: Date | undefined;
    if (poll && pollQuestion && uniquePollOptions.length >= 2) {
        closesAt = poll.closesAt ? new Date(poll.closesAt) : undefined;
        if (closesAt && Number.isNaN(closesAt.getTime())) {
            throw new Error("Invalid poll close date");
        }

        if (closesAt && closesAt.getTime() <= Date.now()) {
            throw new Error("Poll close date must be in the future");
        }
    }

    const created = await prisma.message.create({
        data: {
            chatId,
            senderId,
            content: normalizedContent,
            type,
            parentMessageId,
            metadata: serializeMetadata(metadata),
            modelUsed,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
    if (poll && pollQuestion && uniquePollOptions.length >= 2) {
        await prisma.poll.create({
            data: {
                messageId: created.id,
                question: pollQuestion,
                allowMulti: Boolean(poll.allowMulti),
                closesAt,
                options: {
                    create: uniquePollOptions.map((option, index) => ({
                            text: option,
                            order: index,
                        })),
                },
            },
        });
    }

    await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
    });

    const full = await prisma.message.findUnique({
        where: { id: created.id },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            reactions: true,
            poll: {
                include: {
                    options: {
                        include: {
                            votes: {
                                select: {
                                    voterId: true,
                                },
                            },
                        },
                        orderBy: { order: "asc" },
                    },
                },
            },
        },
    });

    if (!full) {
        throw new Error("Message creation failed");
    }

    return normalizeMessage(full);
};

export const maybeGenerateRoomAiReply = async (
    chatId: string,
    triggerMessage: string,
    requesterId: string,
    model?: string,
    options?: {
        force?: boolean;
    }
) => {
    await ensureChatAccess(chatId, requesterId);

    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            messages: {
                take: 30,
                orderBy: { createdAt: "desc" },
                include: {
                    sender: {
                        select: {
                            name: true,
                            email: true,
                            id: true,
                        },
                    },
                },
            },
        },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    if (!(chat.type === "GROUP" || chat.type === "SOLO")) {
        return null;
    }

    if (!options?.force && !shouldMentionAi(triggerMessage) && chat.type !== "SOLO") {
        return null;
    }

    const systemPrompt = await buildAiSystemPrompt(chat.type);
    const aiModel = model || chat.aiModel || process.env.DEFAULT_AI_MODEL;

    const contextMessages = chat.messages
        .reverse()
        .filter((message) => message.type !== "SYSTEM")
        .map((message) => ({
            role: message.type === "AI" ? ("assistant" as const) : ("user" as const),
            content:
                chat.type === "GROUP"
                    ? `${message.sender.name || message.sender.email}: ${message.content}`
                    : message.content,
        }))
        .slice(-18);

    const response = await generateAIResponse({
        model: aiModel,
        messages: [
            {
                role: "system",
                content: systemPrompt,
            },
            ...contextMessages,
            {
                role: "user",
                content: extractAiPrompt(triggerMessage),
            },
        ],
    });

    return sendMessage({
        chatId,
        senderId: requesterId,
        content: response.content,
        type: "AI",
        modelUsed: response.model,
        metadata: {
            provider: response.provider,
            roomAssistant: chat.type === "GROUP",
        },
    });
};

export const getMessages = async (
    chatId: string,
    userId: string,
    limit: number = 50,
    skip: number = 0
) => {
    const membership = await ensureChatAccess(chatId, userId);

    await prisma.chatMember.update({
        where: {
            userId_chatId: {
                userId,
                chatId,
            },
        },
        data: {
            lastReadAt: new Date(),
        },
    });

    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 50;
    const safeSkip = Number.isFinite(skip) && skip >= 0 ? Math.floor(skip) : 0;

    const [chat, blockedIds] = await Promise.all([
        prisma.chat.findUnique({
            where: { id: chatId },
            select: { type: true },
        }),
        getBlockedUserIds(userId),
    ]);

    if (!chat) {
        throw new Error("Chat not found");
    }

    const messages = await prisma.message.findMany({
        where: { chatId },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            reactions: true,
            poll: {
                include: {
                    options: {
                        include: {
                            votes: {
                                select: {
                                    voterId: true,
                                },
                            },
                        },
                        orderBy: { order: "asc" },
                    },
                },
            },
            flags: {
                where: {
                    status: "RESOLVED",
                },
                select: {
                    id: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: safeLimit,
        skip: safeSkip,
    });

    const filtered = messages.filter((message) => {
        if (message.flags.length > 0 && membership.role !== "ADMIN") {
            return false;
        }

        if (chat.type === "DIRECT" && blockedIds.has(message.senderId) && message.senderId !== userId) {
            return false;
        }

        return true;
    });

    return {
        total: filtered.length,
        messages: filtered.reverse().map(normalizeMessage),
    };
};

export const deleteMessage = async (messageId: string, userId: string) => {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
        throw new Error("Message not found");
    }

    const admin = await isChatAdmin(message.chatId, userId);
    if (message.senderId !== userId && !admin) {
        throw new Error("Unauthorized: Cannot delete this message");
    }

    await prisma.message.update({
        where: { id: messageId },
        data: {
            content: "[deleted]",
            deletedAt: new Date(),
            metadata: JSON.stringify({
                deletedBy: userId,
            }),
        },
    });

    return {
        success: true,
        messageId,
        chatId: message.chatId,
        message: "Message deleted successfully",
    };
};

export const editMessage = async (messageId: string, newContent: string, userId: string) => {
    const normalizedContent = sanitizeContent(newContent);
    if (!normalizedContent) {
        throw new Error("Message content is required");
    }

    if (normalizedContent.length > 5000) {
        throw new Error("Message cannot exceed 5000 characters");
    }

    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!message) {
        throw new Error("Message not found");
    }

    if (message.senderId !== userId) {
        throw new Error("Unauthorized: Cannot edit this message");
    }

    const windowMs = getEditWindowMinutes() * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > windowMs) {
        throw new Error("Message edit window has expired");
    }

    const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
            content: normalizedContent,
            editedAt: new Date(),
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            reactions: true,
            poll: {
                include: {
                    options: {
                        include: {
                            votes: {
                                select: {
                                    voterId: true,
                                },
                            },
                        },
                        orderBy: { order: "asc" },
                    },
                },
            },
        },
    });

    return normalizeMessage(updatedMessage);
};

export const toggleReaction = async (messageId: string, userId: string, emoji: string) => {
    if (!emoji || emoji.length > 10) {
        throw new Error("Invalid emoji");
    }

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
        throw new Error("Message not found");
    }

    await ensureChatAccess(message.chatId, userId);

    const existing = await prisma.messageReaction.findUnique({
        where: {
            messageId_userId_emoji: {
                messageId,
                userId,
                emoji,
            },
        },
    });

    if (existing) {
        await prisma.messageReaction.delete({ where: { id: existing.id } });

        return {
            added: false,
            emoji,
            message: await getNormalizedMessageById(messageId),
        };
    }

    await prisma.messageReaction.create({
        data: {
            messageId,
            userId,
            emoji,
        },
    });

    return {
        added: true,
        emoji,
        message: await getNormalizedMessageById(messageId),
    };
};

export const pinMessage = async (messageId: string, userId: string, pinned: boolean) => {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
        throw new Error("Message not found");
    }

    const admin = await isChatAdmin(message.chatId, userId);
    if (!admin && message.senderId !== userId) {
        throw new Error("Unauthorized: only admins or sender can pin/unpin");
    }

    await prisma.message.update({
        where: { id: messageId },
        data: {
            isPinned: pinned,
        },
    });

    return getNormalizedMessageById(messageId);
};

export const votePoll = async (messageId: string, userId: string, optionId: string) => {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
            poll: {
                include: {
                    options: true,
                },
            },
        },
    });

    if (!message || !message.poll) {
        throw new Error("Poll not found");
    }

    await ensureChatAccess(message.chatId, userId);

    const selectedOption = message.poll.options.find((option) => option.id === optionId);
    if (!selectedOption) {
        throw new Error("Poll option not found");
    }

    if (message.poll.closesAt && message.poll.closesAt.getTime() < Date.now()) {
        throw new Error("Poll is closed");
    }

    if (message.poll.allowMulti) {
        const existingVote = await prisma.pollVote.findFirst({
            where: {
                pollId: message.poll.id,
                optionId,
                voterId: userId,
            },
        });

        if (existingVote) {
            await prisma.pollVote.delete({
                where: {
                    id: existingVote.id,
                },
            });
        } else {
            await prisma.pollVote.create({
                data: {
                    pollId: message.poll.id,
                    optionId,
                    voterId: userId,
                },
            });
        }
    } else {
        const existingVote = await prisma.pollVote.findFirst({
            where: {
                pollId: message.poll.id,
                voterId: userId,
            },
        });

        if (existingVote?.optionId === optionId) {
            await prisma.pollVote.delete({
                where: {
                    id: existingVote.id,
                },
            });
        } else if (existingVote) {
            await prisma.pollVote.update({
                where: {
                    id: existingVote.id,
                },
                data: {
                    optionId,
                },
            });
        } else {
            await prisma.pollVote.create({
                data: {
                    pollId: message.poll.id,
                    optionId,
                    voterId: userId,
                },
            });
        }
    }

    return {
        success: true,
        message: await getNormalizedMessageById(messageId),
    };
};

export const reportMessage = async (messageId: string, userId: string, reason: string) => {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
        throw new Error("Message not found");
    }

    await ensureChatAccess(message.chatId, userId);

    const existing = await prisma.moderationFlag.findFirst({
        where: {
            messageId,
            reporterId: userId,
            status: "OPEN",
        },
    });

    if (existing) {
        return existing;
    }

    return prisma.moderationFlag.create({
        data: {
            messageId,
            reporterId: userId,
            reason: reason.trim() || "No reason provided",
        },
    });
};
