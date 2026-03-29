import { AppError } from "./errors";

export type RoomRole = "ADMIN" | "MODERATOR" | "MEMBER";

const ROOM_ROLE_PRIORITY: Record<RoomRole, number> = {
    ADMIN: 3,
    MODERATOR: 2,
    MEMBER: 1,
};

export const isValidObjectId = (value: string): boolean => {
    return /^[a-f\d]{24}$/i.test(value);
};

export const isValidUuid = (value: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
    );
};

export const escapeRegex = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const normalizeTags = (tags: unknown): string[] => {
    if (!Array.isArray(tags)) {
        return [];
    }

    return Array.from(
        new Set(
            tags
                .map((tag) => String(tag).trim().toLowerCase())
                .filter((tag) => tag.length > 0)
        )
    );
};

export const assertRoomRole = (role: unknown): RoomRole => {
    if (role !== "ADMIN" && role !== "MODERATOR" && role !== "MEMBER") {
        throw new AppError("Invalid room role", 400, "INVALID_ROLE");
    }

    return role;
};

export const canManageMember = (
    actorRole: RoomRole,
    targetRole: RoomRole
): boolean => {
    return ROOM_ROLE_PRIORITY[actorRole] > ROOM_ROLE_PRIORITY[targetRole];
};

export const canAssignRole = (
    actorRole: RoomRole,
    requestedRole: RoomRole
): boolean => {
    if (actorRole === "ADMIN") {
        return true;
    }

    return ROOM_ROLE_PRIORITY[actorRole] > ROOM_ROLE_PRIORITY[requestedRole];
};

export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(max, Math.max(min, value));
};

export const toSafeString = (value: unknown, fallback = ""): string => {
    if (typeof value === "string") {
        return value.trim();
    }

    return fallback;
};
