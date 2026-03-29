import { prisma } from "../lib/prisma";

type ModerationStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export const analytics = async () => {
    const [users, chats, messages, onlineUsers, openFlags, imports] = await Promise.all([
        prisma.user.count(),
        prisma.chat.count(),
        prisma.message.count(),
        prisma.userPresence.count({ where: { isOnline: true } }),
        prisma.moderationFlag.count({ where: { status: "OPEN" } }),
        prisma.chatImport.count(),
    ]);

    const byChatType = await prisma.chat.groupBy({
        by: ["type"],
        _count: true,
    });

    return {
        totals: {
            users,
            chats,
            messages,
            onlineUsers,
            openFlags,
            imports,
        },
        byChatType,
    };
};

export const getFlags = async (status?: ModerationStatus) => {
    return prisma.moderationFlag.findMany({
        where: status ? { status } : undefined,
        include: {
            reporter: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            message: {
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    chat: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
};

export const updateFlag = async (flagId: string, status: ModerationStatus) => {
    return prisma.moderationFlag.update({
        where: { id: flagId },
        data: { status },
    });
};

export const listPromptTemplates = async () => {
    return prisma.promptTemplate.findMany({
        orderBy: { updatedAt: "desc" },
    });
};

export const getActivePromptTemplates = async (scope?: string) => {
    return prisma.promptTemplate.findMany({
        where: {
            isActive: true,
            ...(scope ? { OR: [{ scope }, { scope: "GLOBAL" }] } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
    });
};

export const createPromptTemplate = async (
    adminId: string,
    payload: {
        title: string;
        content: string;
        scope?: string;
        isActive?: boolean;
    }
) => {
    if (!payload.title?.trim() || !payload.content?.trim()) {
        throw new Error("Title and content are required");
    }

    return prisma.promptTemplate.create({
        data: {
            title: payload.title.trim(),
            content: payload.content.trim(),
            scope: payload.scope || "GLOBAL",
            isActive: payload.isActive ?? true,
            createdById: adminId,
        },
    });
};

export const updatePromptTemplate = async (
    promptId: string,
    payload: {
        title?: string;
        content?: string;
        scope?: string;
        isActive?: boolean;
    }
) => {
    if (typeof payload.title === "string" && !payload.title.trim()) {
        throw new Error("Title cannot be empty");
    }

    if (typeof payload.content === "string" && !payload.content.trim()) {
        throw new Error("Content cannot be empty");
    }

    return prisma.promptTemplate.update({
        where: { id: promptId },
        data: {
            title: payload.title?.trim(),
            content: payload.content?.trim(),
            scope: payload.scope,
            isActive: payload.isActive,
        },
    });
};

export const deletePromptTemplate = async (promptId: string) => {
    await prisma.promptTemplate.delete({ where: { id: promptId } });
    return { success: true };
};

export const blockUser = async (blockerId: string, blockedId: string) => {
    if (blockerId === blockedId) {
        throw new Error("You cannot block yourself");
    }

    return prisma.userBlock.upsert({
        where: {
            blockerId_blockedId: {
                blockerId,
                blockedId,
            },
        },
        update: {},
        create: {
            blockerId,
            blockedId,
        },
    });
};

export const unblockUser = async (blockerId: string, blockedId: string) => {
    await prisma.userBlock.deleteMany({
        where: {
            blockerId,
            blockedId,
        },
    });

    return { success: true };
};

export const listBlocks = async (userId?: string) => {
    return prisma.userBlock.findMany({
        where: userId ? { blockerId: userId } : undefined,
        include: {
            blocker: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            blocked: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
};
