import { prisma } from "../lib/prisma";
import { z } from "zod";

type ChatRole = "ADMIN" | "MEMBER";
type ChatType = "DIRECT" | "GROUP" | "SOLO";

const importMessageSchema = z.object({
    role: z.string().trim().min(1).max(30),
    content: z.string().trim().min(1).max(5000),
    createdAt: z
        .string()
        .trim()
        .optional()
        .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
            message: "createdAt must be a valid date string",
        }),
    modelUsed: z.string().trim().max(120).optional(),
});

const parseMetadata = (value: string | null) => {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

const normalizeChatMessage = (message: {
    id: string;
    content: string;
    type: string;
    metadata: string | null;
    modelUsed: string | null;
    isPinned: boolean;
    editedAt: Date | null;
    parentMessageId: string | null;
    chatId: string;
    sender: {
        id: string;
        name: string | null;
        email: string;
    };
    reactions: Array<{
        id: string;
        emoji: string;
        userId: string;
    }>;
    poll: {
        id: string;
        question: string;
        allowMulti: boolean;
        closesAt: Date | null;
        options: Array<{
            id: string;
            text: string;
            order: number;
            votes: Array<{ voterId: string }>;
        }>;
    } | null;
    createdAt: Date;
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
    reactions: message.reactions,
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

export const ensureChatAccess = async (chatId: string, userId: string) => {
    const membership = await prisma.chatMember.findUnique({
        where: {
            userId_chatId: {
                userId,
                chatId,
            },
        },
    });

    if (!membership) {
        throw new Error("Unauthorized: Not a member of this chat");
    }

    return membership;
};

export const createGroupChat = async (data: {
    name: string;
    description?: string;
    createdById: string;
    members?: string[];
    aiModel?: string;
}) => {
    const { name, description, createdById, members = [], aiModel } = data;

    if (!name || !name.trim()) {
        throw new Error("Group name is required");
    }

    const uniqueMembers = [...new Set(members.filter((id) => id && id !== createdById))];

    const chat = await prisma.chat.create({
        data: {
            type: "GROUP",
            name: name.trim(),
            description,
            aiModel,
            createdById,
            members: {
                create: [
                    {
                        userId: createdById,
                        role: "ADMIN",
                    },
                    ...uniqueMembers.map((userId) => ({ userId, role: "MEMBER" as const })),
                ],
            },
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
        },
    });

    return chat;
};

export const createDirectChat = async (userId: string, otherUserId: string) => {
    if (userId === otherUserId) {
        throw new Error("Cannot create direct chat with yourself");
    }

    const block = await prisma.userBlock.findFirst({
        where: {
            OR: [
                { blockerId: userId, blockedId: otherUserId },
                { blockerId: otherUserId, blockedId: userId },
            ],
        },
    });

    if (block) {
        throw new Error("Cannot create direct chat: one user is blocked");
    }

    const candidates = await prisma.chat.findMany({
        where: {
            type: "DIRECT",
            members: {
                some: {
                    userId,
                },
            },
        },
        include: {
            members: true,
        },
        take: 20,
    });

    const existing = candidates.find((candidate) => {
        if (candidate.members.length !== 2) {
            return false;
        }
        const ids = candidate.members.map((member) => member.userId);
        return ids.includes(userId) && ids.includes(otherUserId);
    });

    if (existing) {
        return existing;
    }

    const chat = await prisma.chat.create({
        data: {
            type: "DIRECT",
            members: {
                create: [
                    { userId, role: "MEMBER" },
                    { userId: otherUserId, role: "MEMBER" },
                ],
            },
            createdById: userId,
        },
    });

    return chat;
};

export const getOrCreateSoloChat = async (
    userId: string,
    aiModel?: string,
    options?: {
        fresh?: boolean;
        name?: string;
    }
) => {
    if (!options?.fresh) {
        const existing = await prisma.chat.findFirst({
            where: {
                type: "SOLO",
                members: {
                    some: {
                        userId,
                    },
                },
                archived: false,
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        if (existing) {
            if (aiModel && aiModel !== existing.aiModel) {
                return prisma.chat.update({
                    where: { id: existing.id },
                    data: { aiModel },
                });
            }

            return existing;
        }
    }

    return prisma.chat.create({
        data: {
            type: "SOLO",
            name: options?.name?.trim() || "Solo AI",
            aiModel,
            createdById: userId,
            members: {
                create: [
                    {
                        userId,
                        role: "ADMIN",
                    },
                ],
            },
        },
    });
};

export const listUserChats = async (userId: string) => {
    const chats = await prisma.chat.findMany({
        where: {
            archived: false,
            members: {
                some: {
                    userId,
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            presence: {
                                select: {
                                    isOnline: true,
                                    lastSeenAt: true,
                                },
                            },
                        },
                    },
                },
            },
            messages: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });

    const unreadCounts = await Promise.all(
        chats.map(async (chat) => {
            const membership = chat.members.find((member) => member.userId === userId);
            const unreadCount = await prisma.message.count({
                where: {
                    chatId: chat.id,
                    senderId: { not: userId },
                    createdAt: membership?.lastReadAt ? { gt: membership.lastReadAt } : undefined,
                    deletedAt: null,
                },
            });

            return [chat.id, unreadCount] as const;
        })
    );

    const unreadByChatId = new Map(unreadCounts);

    return chats.map((chat) => {
        const membership = chat.members.find((member) => member.userId === userId) || null;
        const otherMember = chat.members.find((member) => member.userId !== userId) || null;

        return {
        id: chat.id,
        type: chat.type,
        name:
            chat.type === "DIRECT"
                ? otherMember?.user.name || otherMember?.user.email || "Direct Chat"
                : chat.name,
        description: chat.description,
        aiModel: chat.aiModel,
        memberCount: chat.members.length,
        members: chat.members,
        membership,
        unreadCount: unreadByChatId.get(chat.id) || 0,
        directPeerPresence:
            chat.type === "DIRECT"
                ? {
                      isOnline: Boolean(otherMember?.user.presence?.isOnline),
                      lastSeenAt: otherMember?.user.presence?.lastSeenAt || null,
                  }
                : null,
        lastMessage: chat.messages[0] || null,
        updatedAt: chat.updatedAt,
        };
    });
};

export const getChatDetails = async (chatId: string, userId: string) => {
    await ensureChatAccess(chatId, userId);

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

    const [chat, blockedByUser] = await Promise.all([
        prisma.chat.findUnique({
        where: { id: chatId },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
            messages: {
                orderBy: { createdAt: "asc" },
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
            },
            insights: {
                take: 3,
                orderBy: { generatedAt: "desc" },
            },
        },
    }),
        prisma.userBlock.findMany({
            where: {
                blockerId: userId,
            },
            select: {
                blockedId: true,
            },
        }),
    ]);

    if (!chat) {
        throw new Error("Chat not found");
    }

    const blockedIds = new Set(blockedByUser.map((item) => item.blockedId));

    const messages = chat.messages
        .filter((message) => {
            if (message.flags.length > 0) {
                return false;
            }

            if (chat.type === "DIRECT" && blockedIds.has(message.senderId)) {
                return false;
            }

            return true;
        })
        .map((message) => normalizeChatMessage(message));

    return {
        ...chat,
        messages,
    };
};

const ensureAdmin = async (chatId: string, userId: string) => {
    const membership = await prisma.chatMember.findUnique({
        where: {
            userId_chatId: {
                userId,
                chatId,
            },
        },
    });

    if (!membership || membership.role !== "ADMIN") {
        throw new Error("Only group admins can perform this action");
    }
};

export const updateChat = async (
    chatId: string,
    userId: string,
    data: {
        name?: string;
        description?: string;
        aiModel?: string;
    }
) => {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type === "GROUP") {
        await ensureAdmin(chatId, userId);
    } else {
        await ensureChatAccess(chatId, userId);
    }

    return prisma.chat.update({
        where: { id: chatId },
        data,
    });
};

export const addMember = async (chatId: string, userId: string, targetUserId: string) => {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type !== "GROUP") {
        throw new Error("Members can only be added to group chats");
    }

    await ensureAdmin(chatId, userId);

    return prisma.chatMember.create({
        data: {
            chatId,
            userId: targetUserId,
            role: "MEMBER",
        },
    });
};

export const removeMember = async (chatId: string, userId: string, targetUserId: string) => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { members: true },
    });

    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type !== "GROUP") {
        throw new Error("Members can only be removed from group chats");
    }

    if (userId !== targetUserId) {
        await ensureAdmin(chatId, userId);
    }

    const targetMembership = chat.members.find((member) => member.userId === targetUserId);
    if (!targetMembership) {
        throw new Error("Member does not exist");
    }

    if (targetMembership.role === "ADMIN") {
        const admins = chat.members.filter((member) => member.role === "ADMIN");
        if (admins.length === 1) {
            throw new Error("Cannot remove the last admin from the group");
        }
    }

    await prisma.chatMember.delete({
        where: {
            userId_chatId: {
                userId: targetUserId,
                chatId,
            },
        },
    });

    return { success: true };
};

export const changeMemberRole = async (
    chatId: string,
    userId: string,
    targetUserId: string,
    role: ChatRole
) => {
    await ensureAdmin(chatId, userId);

    const members = await prisma.chatMember.findMany({ where: { chatId } });
    if (role === "MEMBER") {
        const target = members.find((member) => member.userId === targetUserId);
        const adminCount = members.filter((member) => member.role === "ADMIN").length;

        if (target?.role === "ADMIN" && adminCount === 1) {
            throw new Error("Cannot demote the last admin");
        }
    }

    return prisma.chatMember.update({
        where: {
            userId_chatId: {
                userId: targetUserId,
                chatId,
            },
        },
        data: {
            role,
        },
    });
};

export const deleteChat = async (chatId: string, userId: string) => {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
        throw new Error("Chat not found");
    }

    if (chat.type === "GROUP") {
        await ensureAdmin(chatId, userId);
    } else {
        await ensureChatAccess(chatId, userId);
    }

    await prisma.chat.delete({ where: { id: chatId } });
    return { success: true };
};

export const exportChat = async (chatId: string, userId: string, format: "json" | "markdown") => {
    const chat = await getChatDetails(chatId, userId);
    if (!chat) {
        throw new Error("Chat not found");
    }

    const payload = {
        chat: {
            id: chat.id,
            type: chat.type,
            name: chat.name,
            aiModel: chat.aiModel,
        },
        messages: chat.messages.map((message) => ({
            id: message.id,
            type: message.type,
            content: message.content,
            sender: message.senderName || message.senderEmail,
            createdAt: message.createdAt,
            modelUsed: message.modelUsed,
            parentMessageId: message.parentMessageId,
        })),
    };

    if (format === "markdown") {
        const markdown = [
            `# ${chat.name || "Conversation"}`,
            "",
            ...payload.messages.map(
                (message) =>
                    `## ${message.sender} (${new Date(message.createdAt).toISOString()})\n\n${message.content}\n`
            ),
        ].join("\n");

        return {
            format,
            fileName: `${chat.id}.md`,
            content: markdown,
        };
    }

    return {
        format,
        fileName: `${chat.id}.json`,
        content: JSON.stringify(payload, null, 2),
    };
};

export const importConversation = async (data: {
    userId: string;
    sourceModel?: string;
    format: string;
    name?: string;
    messages: Array<{ role: string; content: string; createdAt?: string; modelUsed?: string }>;
}) => {
    const { userId, sourceModel, format, name, messages } = data;

    if (!Array.isArray(messages) || !messages.length) {
        throw new Error("No messages to import");
    }

    const normalizedFormat = String(format || "json").trim().toLowerCase();

    if (!["json", "markdown"].includes(normalizedFormat)) {
        throw new Error("Unsupported import format");
    }

    const validatedMessages = messages
        .slice(0, 800)
        .map((item) => importMessageSchema.parse(item));

    const chat = await prisma.chat.create({
        data: {
            type: "SOLO",
            name: name?.trim() || `Imported ${new Date().toLocaleString()}`,
            aiModel: sourceModel,
            createdById: userId,
            members: {
                create: [{ userId, role: "ADMIN" }],
            },
        },
    });

    const senderUserId = userId;

    for (const item of validatedMessages) {
        const isAi = item.role.toLowerCase() !== "user";
        await prisma.message.create({
            data: {
                chatId: chat.id,
                senderId: senderUserId,
                content: item.content,
                type: isAi ? "AI" : "TEXT",
                createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
                modelUsed: item.modelUsed || sourceModel,
                metadata: JSON.stringify({
                    importedRole: item.role,
                }),
            },
        });
    }

    await prisma.chatImport.create({
        data: {
            userId,
            chatId: chat.id,
            sourceModel,
            format: normalizedFormat,
            rawPayload: JSON.stringify({
                messageCount: validatedMessages.length,
                importedAt: new Date().toISOString(),
            }),
        },
    });

    return chat;
};

export const getUsersForPicker = async (query: string, userId: string) => {
    return prisma.user.findMany({
        where: {
            id: { not: userId },
            OR: [
                { email: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
            ],
        },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            email: true,
            name: true,
            isAdmin: true,
        },
    });
};

export const getOnlineUsers = async () => {
    return prisma.userPresence.findMany({
        where: { isOnline: true },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
};

export const getAvailableChatTypes = (): ChatType[] => ["DIRECT", "GROUP", "SOLO"];
