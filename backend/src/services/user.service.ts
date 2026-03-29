import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";

export const updateUserProfile = async (
    userId: string,
    payload: {
        displayName?: string;
        bio?: string;
        avatar?: string;
    }
) => {
    const displayName = payload.displayName?.trim();
    const bio = payload.bio?.trim();
    const avatar = payload.avatar?.trim();

    if (displayName !== undefined && (displayName.length < 2 || displayName.length > 60)) {
        throw new AppError("displayName must be between 2 and 60 characters", 400, "VALIDATION_ERROR");
    }

    if (bio !== undefined && bio.length > 500) {
        throw new AppError("bio cannot exceed 500 characters", 400, "VALIDATION_ERROR");
    }

    const updated = await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            ...(displayName !== undefined ? { displayName } : {}),
            ...(bio !== undefined ? { bio } : {}),
            ...(avatar !== undefined ? { avatar } : {}),
        },
        select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            bio: true,
            onlineStatus: true,
            lastSeen: true,
        },
    });

    return updated;
};

export const getPublicUserProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            bio: true,
            onlineStatus: true,
            lastSeen: true,
            createdAt: true,
        },
    });

    if (!user) {
        throw new AppError("User not found", 404, "NOT_FOUND");
    }

    return user;
};
