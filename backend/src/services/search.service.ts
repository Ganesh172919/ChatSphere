import { prisma } from "../config/prisma";

interface MessageSearchFilters {
    q: string;
    roomId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    isAI?: boolean;
    pinned?: boolean;
    hasFiles?: boolean;
    limit?: number;
}

const parseDate = (value?: string): Date | undefined => {
    if (!value) {
        return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const searchMessages = async (requesterId: string, filters: MessageSearchFilters) => {
    const roomMemberships = await prisma.roomMember.findMany({
        where: {
            userId: requesterId,
        },
        select: {
            roomId: true,
        },
    });

    const roomIds = roomMemberships.map((entry) => entry.roomId);

    if (roomIds.length === 0) {
        return [];
    }

    const blockedPairs = await prisma.userBlock.findMany({
        where: {
            OR: [
                {
                    blockerId: requesterId,
                },
                {
                    blockedId: requesterId,
                },
            ],
        },
        select: {
            blockerId: true,
            blockedId: true,
        },
    });

    const blockedUserIds = new Set<string>();

    for (const block of blockedPairs) {
        if (block.blockerId === requesterId) {
            blockedUserIds.add(block.blockedId);
        }

        if (block.blockedId === requesterId) {
            blockedUserIds.add(block.blockerId);
        }
    }

    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);

    const rows = await prisma.message.findMany({
        where: {
            roomId: filters.roomId
                ? filters.roomId
                : {
                      in: roomIds,
                  },
            ...(filters.userId ? { userId: filters.userId } : {}),
            ...(filters.q
                ? {
                      content: {
                          contains: filters.q,
                          mode: "insensitive",
                      },
                  }
                : {}),
            ...(typeof filters.isAI === "boolean" ? { isAI: filters.isAI } : {}),
            ...(typeof filters.pinned === "boolean" ? { isPinned: filters.pinned } : {}),
            ...(typeof filters.hasFiles === "boolean"
                ? filters.hasFiles
                    ? { fileUrl: { not: null } }
                    : { fileUrl: null }
                : {}),
            ...(startDate || endDate
                ? {
                      createdAt: {
                          ...(startDate ? { gte: startDate } : {}),
                          ...(endDate ? { lte: endDate } : {}),
                      },
                  }
                : {}),
            isDeleted: false,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: Math.min(Math.max(filters.limit ?? 50, 1), 100),
    });

    return rows.filter((row) => !blockedUserIds.has(row.userId));
};

export const searchConversations = async (
    requesterId: string,
    query: string,
    limit = 50
) => {
    const rows = await prisma.conversation.findMany({
        where: {
            userId: requesterId,
            OR: [
                {
                    title: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
            ],
        },
        orderBy: {
            updatedAt: "desc",
        },
        take: Math.min(Math.max(limit, 1), 100),
    });

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const fallbackMatches = await prisma.conversation.findMany({
        where: {
            userId: requesterId,
        },
        orderBy: {
            updatedAt: "desc",
        },
        take: 200,
    });

    const merged = new Map<string, typeof fallbackMatches[number]>();

    for (const row of rows) {
        merged.set(row.id, row);
    }

    for (const row of fallbackMatches) {
        const messages = Array.isArray(row.messages) ? row.messages : [];
        const textBlob = messages
            .map((entry) => {
                const item = entry as Record<string, unknown>;
                return String(item.content ?? "");
            })
            .join("\n");

        if (regex.test(row.title) || regex.test(textBlob)) {
            merged.set(row.id, row);
        }
    }

    return Array.from(merged.values()).slice(0, Math.min(Math.max(limit, 1), 100));
};
