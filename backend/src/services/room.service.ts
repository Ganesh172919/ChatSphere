import { Prisma, RoomMemberRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";
import {
    assertRoomRole,
    canAssignRole,
    canManageMember,
    normalizeTags,
    RoomRole,
} from "../helpers/validation";
import { buildInitialRoomAiHistory } from "./promptCatalog.service";
import { getInsight, refreshRoomInsight } from "./conversationInsights.service";

const toJson = (value: unknown): Prisma.InputJsonValue => {
    return value as Prisma.InputJsonValue;
};

const assertRoomMembership = async (roomId: string, userId: string) => {
    const room = await prisma.room.findUnique({
        where: {
            id: roomId,
        },
    });

    if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
    }

    const membership = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId,
            },
        },
    });

    if (!membership) {
        throw new AppError("You are not a member of this room", 403, "FORBIDDEN");
    }

    return {
        room,
        membership,
    };
};

const toRole = (role: RoomMemberRole): RoomRole => {
    if (role === RoomMemberRole.ADMIN) {
        return "ADMIN";
    }

    if (role === RoomMemberRole.MODERATOR) {
        return "MODERATOR";
    }

    return "MEMBER";
};

export const getRoomsForUser = async (userId: string) => {
    const memberships = await prisma.roomMember.findMany({
        where: {
            userId,
        },
        include: {
            room: {
                include: {
                    _count: {
                        select: {
                            messages: true,
                            members: true,
                        },
                    },
                    messages: {
                        where: {
                            isDeleted: false,
                        },
                        take: 1,
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
            },
        },
        orderBy: {
            joinedAt: "desc",
        },
    });

    return memberships.map((membership) => ({
        id: membership.room.id,
        name: membership.room.name,
        description: membership.room.description,
        tags: membership.room.tags,
        maxUsers: membership.room.maxUsers,
        role: membership.role,
        memberCount: membership.room._count.members,
        messageCount: membership.room._count.messages,
        lastActivityAt: membership.room.messages[0]?.createdAt ?? membership.room.updatedAt,
        createdAt: membership.room.createdAt,
        updatedAt: membership.room.updatedAt,
    }));
};

export const createRoom = async (
    userId: string,
    payload: {
        name: string;
        description?: string;
        tags?: string[];
        maxUsers?: number;
    }
) => {
    const name = payload.name.trim();

    if (name.length < 3 || name.length > 80) {
        throw new AppError("Room name must be between 3 and 80 characters", 400, "VALIDATION_ERROR");
    }

    const maxUsers = Number(payload.maxUsers ?? 100);

    if (!Number.isInteger(maxUsers) || maxUsers < 2 || maxUsers > 5000) {
        throw new AppError("maxUsers must be between 2 and 5000", 400, "VALIDATION_ERROR");
    }

    const tags = normalizeTags(payload.tags);
    const aiHistory = await buildInitialRoomAiHistory(name);

    const room = await prisma.room.create({
        data: {
            name,
            description: payload.description?.trim(),
            tags: toJson(tags),
            maxUsers,
            creatorId: userId,
            aiHistory: toJson(aiHistory),
            members: {
                create: {
                    userId,
                    role: RoomMemberRole.ADMIN,
                },
            },
        },
    });

    return room;
};

export const joinRoom = async (userId: string, roomId: string) => {
    const room = await prisma.room.findUnique({
        where: {
            id: roomId,
        },
        include: {
            _count: {
                select: {
                    members: true,
                },
            },
        },
    });

    if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
    }

    const existing = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId,
            },
        },
    });

    if (existing) {
        return {
            joined: false,
            message: "Already a member",
        };
    }

    if (room._count.members >= room.maxUsers) {
        throw new AppError("Room is full", 400, "ROOM_FULL");
    }

    await prisma.roomMember.create({
        data: {
            roomId,
            userId,
            role: RoomMemberRole.MEMBER,
        },
    });

    return {
        joined: true,
        message: "Joined room successfully",
    };
};

export const leaveRoom = async (userId: string, roomId: string) => {
    const room = await prisma.room.findUnique({
        where: {
            id: roomId,
        },
    });

    if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
    }

    if (room.creatorId === userId) {
        throw new AppError("Room creator cannot leave their own room", 400, "CREATOR_CANNOT_LEAVE");
    }

    const deleted = await prisma.roomMember.deleteMany({
        where: {
            roomId,
            userId,
        },
    });

    if (deleted.count === 0) {
        throw new AppError("You are not a member of this room", 404, "NOT_FOUND");
    }

    return {
        success: true,
    };
};

export const getRoomById = async (userId: string, roomId: string) => {
    await assertRoomMembership(roomId, userId);

    const room = await prisma.room.findUnique({
        where: {
            id: roomId,
        },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatar: true,
                            onlineStatus: true,
                            lastSeen: true,
                        },
                    },
                },
            },
            messages: {
                where: {
                    isDeleted: false,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 50,
            },
        },
    });

    if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
    }

    const insight = await getInsight("ROOM", roomId);

    return {
        id: room.id,
        name: room.name,
        description: room.description,
        tags: room.tags,
        maxUsers: room.maxUsers,
        creatorId: room.creatorId,
        aiHistory: room.aiHistory,
        members: room.members.map((member) => ({
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            user: member.user,
        })),
        messages: room.messages.reverse(),
        insight,
    };
};

export const deleteRoom = async (userId: string, roomId: string) => {
    const room = await prisma.room.findUnique({
        where: {
            id: roomId,
        },
    });

    if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
    }

    if (room.creatorId !== userId) {
        throw new AppError("Only room creator can delete this room", 403, "FORBIDDEN");
    }

    await prisma.$transaction([
        prisma.message.deleteMany({
            where: {
                roomId,
            },
        }),
        prisma.roomMember.deleteMany({
            where: {
                roomId,
            },
        }),
        prisma.poll.deleteMany({
            where: {
                roomId,
            },
        }),
        prisma.report.deleteMany({
            where: {
                roomId,
            },
        }),
        prisma.room.delete({
            where: {
                id: roomId,
            },
        }),
    ]);

    return {
        success: true,
    };
};

export const runRoomAction = async (
    userId: string,
    roomId: string,
    action: "summarize" | "extract-tasks" | "extract-decisions"
) => {
    await assertRoomMembership(roomId, userId);

    const insight = await refreshRoomInsight(roomId);

    if (!insight) {
        throw new AppError("Unable to generate room insight", 500, "INSIGHT_FAILED");
    }

    if (action === "summarize") {
        return {
            summary: insight.summary,
            title: insight.title,
        };
    }

    if (action === "extract-tasks") {
        return {
            tasks: Array.isArray(insight.actionItems)
                ? insight.actionItems.map((item) => String(item))
                : [],
        };
    }

    return {
        decisions: Array.isArray(insight.decisions)
            ? insight.decisions.map((item) => String(item))
            : [],
    };
};

export const pinMessage = async (userId: string, roomId: string, messageId: string) => {
    const { membership } = await assertRoomMembership(roomId, userId);

    if (membership.role === RoomMemberRole.MEMBER) {
        throw new AppError("Only admins or moderators can pin messages", 403, "FORBIDDEN");
    }

    const message = await prisma.message.findFirst({
        where: {
            id: messageId,
            roomId,
        },
    });

    if (!message) {
        throw new AppError("Message not found", 404, "NOT_FOUND");
    }

    return prisma.message.update({
        where: {
            id: message.id,
        },
        data: {
            isPinned: true,
            pinnedAt: new Date(),
            pinnedBy: userId,
        },
    });
};

export const unpinMessage = async (userId: string, roomId: string, messageId: string) => {
    const { membership } = await assertRoomMembership(roomId, userId);

    if (membership.role === RoomMemberRole.MEMBER) {
        throw new AppError("Only admins or moderators can unpin messages", 403, "FORBIDDEN");
    }

    const message = await prisma.message.findFirst({
        where: {
            id: messageId,
            roomId,
        },
    });

    if (!message) {
        throw new AppError("Message not found", 404, "NOT_FOUND");
    }

    return prisma.message.update({
        where: {
            id: message.id,
        },
        data: {
            isPinned: false,
            pinnedAt: null,
            pinnedBy: null,
        },
    });
};

export const getPinnedMessages = async (userId: string, roomId: string) => {
    await assertRoomMembership(roomId, userId);

    return prisma.message.findMany({
        where: {
            roomId,
            isPinned: true,
            isDeleted: false,
        },
        orderBy: {
            pinnedAt: "desc",
        },
    });
};

export const getGroupMembers = async (actorId: string, roomId: string) => {
    const { membership } = await assertRoomMembership(roomId, actorId);

    const members = await prisma.roomMember.findMany({
        where: {
            roomId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatar: true,
                    onlineStatus: true,
                },
            },
        },
        orderBy: {
            joinedAt: "asc",
        },
    });

    const actorRole = toRole(membership.role);

    return members.map((member) => {
        const targetRole = toRole(member.role);

        return {
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            user: member.user,
            canManage: canManageMember(actorRole, targetRole),
        };
    });
};

export const updateGroupMemberRole = async (
    actorId: string,
    roomId: string,
    targetUserId: string,
    roleInput: unknown
) => {
    const role = assertRoomRole(roleInput);
    const { membership } = await assertRoomMembership(roomId, actorId);
    const actorRole = toRole(membership.role);

    if (!canAssignRole(actorRole, role)) {
        throw new AppError("Insufficient permission to assign this role", 403, "FORBIDDEN");
    }

    const targetMembership = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId: targetUserId,
            },
        },
    });

    if (!targetMembership) {
        throw new AppError("Target user is not in the room", 404, "NOT_FOUND");
    }

    const targetRole = toRole(targetMembership.role);

    if (!canManageMember(actorRole, targetRole)) {
        throw new AppError("Insufficient permission to manage this member", 403, "FORBIDDEN");
    }

    return prisma.roomMember.update({
        where: {
            roomId_userId: {
                roomId,
                userId: targetUserId,
            },
        },
        data: {
            role: RoomMemberRole[role],
        },
    });
};

export const removeGroupMember = async (
    actorId: string,
    roomId: string,
    targetUserId: string
) => {
    const room = await prisma.room.findUnique({
        where: {
            id: roomId,
        },
    });

    if (!room) {
        throw new AppError("Room not found", 404, "NOT_FOUND");
    }

    if (room.creatorId === targetUserId) {
        throw new AppError("Cannot remove room creator", 400, "VALIDATION_ERROR");
    }

    const { membership } = await assertRoomMembership(roomId, actorId);
    const actorRole = toRole(membership.role);

    const targetMembership = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId: targetUserId,
            },
        },
    });

    if (!targetMembership) {
        throw new AppError("Target user is not in the room", 404, "NOT_FOUND");
    }

    const targetRole = toRole(targetMembership.role);

    if (!canManageMember(actorRole, targetRole)) {
        throw new AppError("Insufficient permission to remove this member", 403, "FORBIDDEN");
    }

    await prisma.roomMember.delete({
        where: {
            roomId_userId: {
                roomId,
                userId: targetUserId,
            },
        },
    });

    return {
        success: true,
    };
};

export const getRoomInsight = async (userId: string, roomId: string) => {
    await assertRoomMembership(roomId, userId);

    return getInsight("ROOM", roomId);
};
