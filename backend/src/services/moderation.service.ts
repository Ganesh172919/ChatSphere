import { ReportStatus, ReportTargetType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";

export const createReport = async (payload: {
    reporterId: string;
    targetType: "user" | "message";
    targetId: string;
    roomId?: string;
    reason: string;
    description?: string;
}) => {
    const targetType =
        payload.targetType === "user" ? ReportTargetType.USER : ReportTargetType.MESSAGE;

    if (targetType === ReportTargetType.USER) {
        const target = await prisma.user.findUnique({
            where: {
                id: payload.targetId,
            },
        });

        if (!target) {
            throw new AppError("Target user not found", 404, "NOT_FOUND");
        }
    } else {
        const target = await prisma.message.findUnique({
            where: {
                id: payload.targetId,
            },
        });

        if (!target) {
            throw new AppError("Target message not found", 404, "NOT_FOUND");
        }
    }

    const existingPending = await prisma.report.findFirst({
        where: {
            reporterId: payload.reporterId,
            targetType,
            targetId: payload.targetId,
            status: ReportStatus.PENDING,
        },
    });

    if (existingPending) {
        throw new AppError("Pending report already exists for this target", 409, "CONFLICT");
    }

    return prisma.report.create({
        data: {
            reporterId: payload.reporterId,
            targetType,
            targetId: payload.targetId,
            roomId: payload.roomId,
            reason: payload.reason.trim(),
            description: payload.description?.trim(),
            status: ReportStatus.PENDING,
        },
    });
};

export const blockUser = async (userId: string, blockedUserId: string) => {
    if (userId === blockedUserId) {
        throw new AppError("You cannot block yourself", 400, "VALIDATION_ERROR");
    }

    const target = await prisma.user.findUnique({
        where: {
            id: blockedUserId,
        },
    });

    if (!target) {
        throw new AppError("User not found", 404, "NOT_FOUND");
    }

    await prisma.userBlock.upsert({
        where: {
            blockerId_blockedId: {
                blockerId: userId,
                blockedId: blockedUserId,
            },
        },
        create: {
            blockerId: userId,
            blockedId: blockedUserId,
        },
        update: {},
    });

    return {
        success: true,
    };
};

export const unblockUser = async (userId: string, blockedUserId: string) => {
    await prisma.userBlock.deleteMany({
        where: {
            blockerId: userId,
            blockedId: blockedUserId,
        },
    });

    return {
        success: true,
    };
};

export const listBlockedUsers = async (userId: string) => {
    const blocks = await prisma.userBlock.findMany({
        where: {
            blockerId: userId,
        },
        include: {
            blocked: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatar: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return blocks.map((entry) => entry.blocked);
};
