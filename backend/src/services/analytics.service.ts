import { prisma } from "../config/prisma";

const startOfDay = (date: Date): Date => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const formatDay = (date: Date): string => {
    return date.toISOString().slice(0, 10);
};

export const getDailyMessageCounts = async (days: number) => {
    const boundedDays = Math.max(1, Math.min(days, 90));
    const start = startOfDay(new Date(Date.now() - (boundedDays - 1) * 24 * 60 * 60 * 1000));

    const rows = await prisma.message.findMany({
        where: {
            createdAt: {
                gte: start,
            },
            isDeleted: false,
        },
        select: {
            createdAt: true,
        },
    });

    const counts = new Map<string, number>();

    for (const row of rows) {
        const day = formatDay(row.createdAt);
        counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    return Array.from({ length: boundedDays }).map((_, index) => {
        const day = formatDay(new Date(start.getTime() + index * 24 * 60 * 60 * 1000));

        return {
            day,
            messageCount: counts.get(day) ?? 0,
        };
    });
};

export const getDailyActiveUsers = async (days: number) => {
    const boundedDays = Math.max(1, Math.min(days, 90));
    const start = startOfDay(new Date(Date.now() - (boundedDays - 1) * 24 * 60 * 60 * 1000));

    const rows = await prisma.message.findMany({
        where: {
            createdAt: {
                gte: start,
            },
            isDeleted: false,
        },
        select: {
            userId: true,
            createdAt: true,
        },
    });

    const uniqueByDay = new Map<string, Set<string>>();

    for (const row of rows) {
        const day = formatDay(row.createdAt);
        const set = uniqueByDay.get(day) ?? new Set<string>();
        set.add(row.userId);
        uniqueByDay.set(day, set);
    }

    return Array.from({ length: boundedDays }).map((_, index) => {
        const day = formatDay(new Date(start.getTime() + index * 24 * 60 * 60 * 1000));

        return {
            day,
            activeUsers: uniqueByDay.get(day)?.size ?? 0,
        };
    });
};

export const getTopRoomsByActivity = async () => {
    const grouped = await prisma.message.groupBy({
        by: ["roomId"],
        _count: {
            _all: true,
        },
        _max: {
            createdAt: true,
        },
        where: {
            isDeleted: false,
        },
        orderBy: {
            _count: {
                roomId: "desc",
            },
        },
        take: 20,
    });

    const roomIds = grouped.map((item) => item.roomId);

    const rooms = await prisma.room.findMany({
        where: {
            id: {
                in: roomIds,
            },
        },
        select: {
            id: true,
            name: true,
        },
    });

    const roomMap = new Map(rooms.map((room) => [room.id, room]));

    return grouped.map((entry) => ({
        roomId: entry.roomId,
        roomName: roomMap.get(entry.roomId)?.name ?? "Unknown room",
        messageCount: entry._count._all,
        lastActivity: entry._max.createdAt,
    }));
};
