import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";

const DEFAULT_SETTINGS = {
    theme: "system",
    accentColor: "teal",
    notifications: {
        email: true,
        push: true,
        mentions: true,
    },
    aiFeatures: {
        smartReplies: true,
        sentiment: true,
        grammar: true,
    },
};

const toJson = (value: unknown): Prisma.InputJsonValue => {
    return value as Prisma.InputJsonValue;
};

const normalizeSettings = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return DEFAULT_SETTINGS;
    }

    const record = value as Record<string, unknown>;

    return {
        theme:
            record.theme === "light" || record.theme === "dark" || record.theme === "system"
                ? record.theme
                : DEFAULT_SETTINGS.theme,
        accentColor:
            typeof record.accentColor === "string" && record.accentColor.trim().length > 0
                ? record.accentColor
                : DEFAULT_SETTINGS.accentColor,
        notifications: {
            email:
                typeof (record.notifications as Record<string, unknown> | undefined)?.email ===
                "boolean"
                    ? Boolean((record.notifications as Record<string, unknown>).email)
                    : DEFAULT_SETTINGS.notifications.email,
            push:
                typeof (record.notifications as Record<string, unknown> | undefined)?.push ===
                "boolean"
                    ? Boolean((record.notifications as Record<string, unknown>).push)
                    : DEFAULT_SETTINGS.notifications.push,
            mentions:
                typeof (record.notifications as Record<string, unknown> | undefined)?.mentions ===
                "boolean"
                    ? Boolean((record.notifications as Record<string, unknown>).mentions)
                    : DEFAULT_SETTINGS.notifications.mentions,
        },
        aiFeatures: {
            smartReplies:
                typeof (record.aiFeatures as Record<string, unknown> | undefined)
                    ?.smartReplies === "boolean"
                    ? Boolean((record.aiFeatures as Record<string, unknown>).smartReplies)
                    : DEFAULT_SETTINGS.aiFeatures.smartReplies,
            sentiment:
                typeof (record.aiFeatures as Record<string, unknown> | undefined)?.sentiment ===
                "boolean"
                    ? Boolean((record.aiFeatures as Record<string, unknown>).sentiment)
                    : DEFAULT_SETTINGS.aiFeatures.sentiment,
            grammar:
                typeof (record.aiFeatures as Record<string, unknown> | undefined)?.grammar ===
                "boolean"
                    ? Boolean((record.aiFeatures as Record<string, unknown>).grammar)
                    : DEFAULT_SETTINGS.aiFeatures.grammar,
        },
    };
};

export const getSettings = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            settings: true,
        },
    });

    if (!user) {
        throw new AppError("User not found", 404, "NOT_FOUND");
    }

    return normalizeSettings(user.settings);
};

export const updateSettings = async (
    userId: string,
    partial: Partial<typeof DEFAULT_SETTINGS>
) => {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            settings: true,
        },
    });

    if (!user) {
        throw new AppError("User not found", 404, "NOT_FOUND");
    }

    const current = normalizeSettings(user.settings);
    const merged = normalizeSettings({
        ...current,
        ...partial,
        notifications: {
            ...current.notifications,
            ...(partial.notifications ?? {}),
        },
        aiFeatures: {
            ...current.aiFeatures,
            ...(partial.aiFeatures ?? {}),
        },
    });

    const updated = await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            settings: toJson(merged),
        },
        select: {
            settings: true,
        },
    });

    return normalizeSettings(updated.settings);
};
