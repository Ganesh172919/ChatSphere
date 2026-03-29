import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";
import {
    getInsight,
    refreshConversationInsight,
} from "./conversationInsights.service";

interface ConversationMessageItem {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    memoryRefs?: string[];
    file?: {
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
    };
    modelTelemetry?: Record<string, unknown>;
}

const toJson = (value: unknown): Prisma.InputJsonValue => {
    return value as Prisma.InputJsonValue;
};

const normalizeConversationMessages = (value: unknown): ConversationMessageItem[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => {
            const record = entry as Record<string, unknown>;
            return {
                role: (record.role === "assistant" ? "assistant" : "user") as
                    | "assistant"
                    | "user",
                content: String(record.content ?? ""),
                timestamp: String(record.timestamp ?? new Date().toISOString()),
                memoryRefs: Array.isArray(record.memoryRefs)
                    ? record.memoryRefs.map((item) => String(item))
                    : undefined,
                file:
                    record.file && typeof record.file === "object"
                        ? (record.file as ConversationMessageItem["file"])
                        : undefined,
                modelTelemetry:
                    record.modelTelemetry && typeof record.modelTelemetry === "object"
                        ? (record.modelTelemetry as Record<string, unknown>)
                        : undefined,
            };
        })
        .filter((entry) => entry.content.trim().length > 0);
};

export const listConversations = async (userId: string) => {
    const conversations = await prisma.conversation.findMany({
        where: {
            userId,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
        take: 100,
    });

    return conversations.map((conversation) => {
        const messages = normalizeConversationMessages(conversation.messages);

        return {
            id: conversation.id,
            title: conversation.title,
            project: conversation.project,
            messageCount: messages.length,
            lastMessage: messages[messages.length - 1]?.content ?? null,
            updatedAt: conversation.updatedAt,
            createdAt: conversation.createdAt,
        };
    });
};

export const getConversationById = async (userId: string, conversationId: string) => {
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                },
            },
        },
    });

    if (!conversation) {
        throw new AppError("Conversation not found", 404, "NOT_FOUND");
    }

    return {
        id: conversation.id,
        title: conversation.title,
        project: conversation.project,
        importMetadata: conversation.importMetadata,
        messages: normalizeConversationMessages(conversation.messages),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
    };
};

export const getConversationInsight = async (userId: string, conversationId: string) => {
    await getConversationById(userId, conversationId);
    return getInsight("CONVERSATION", conversationId);
};

export const runConversationAction = async (
    userId: string,
    conversationId: string,
    action: "summarize" | "extract-tasks" | "extract-decisions"
) => {
    await getConversationById(userId, conversationId);

    const insight = await refreshConversationInsight(conversationId);

    if (!insight) {
        throw new AppError("Unable to generate insight", 500, "INSIGHT_FAILED");
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

export const deleteConversation = async (userId: string, conversationId: string) => {
    const result = await prisma.conversation.deleteMany({
        where: {
            id: conversationId,
            userId,
        },
    });

    if (result.count === 0) {
        throw new AppError("Conversation not found", 404, "NOT_FOUND");
    }

    await prisma.conversationInsight.deleteMany({
        where: {
            scopeKey: `conversation:${conversationId}`,
        },
    });

    return {
        success: true,
    };
};

export const appendConversationMessages = async (
    userId: string,
    payload: {
        conversationId?: string;
        title?: string;
        projectId?: string | null;
        messages: ConversationMessageItem[];
        importMetadata?: Record<string, unknown>;
    }
) => {
    if (payload.messages.length === 0) {
        throw new AppError("Conversation messages are required", 400, "VALIDATION_ERROR");
    }

    if (payload.conversationId) {
        const existing = await prisma.conversation.findFirst({
            where: {
                id: payload.conversationId,
                userId,
            },
        });

        if (!existing) {
            throw new AppError("Conversation not found", 404, "NOT_FOUND");
        }

        const mergedMessages = [
            ...normalizeConversationMessages(existing.messages),
            ...payload.messages,
        ];

        const updated = await prisma.conversation.update({
            where: {
                id: existing.id,
            },
            data: {
                title: payload.title ?? existing.title,
                projectId:
                    payload.projectId === undefined ? existing.projectId : payload.projectId,
                messages: toJson(mergedMessages),
                importMetadata: payload.importMetadata
                    ? toJson(payload.importMetadata)
                    : existing.importMetadata ?? Prisma.JsonNull,
            },
        });

        return updated;
    }

    return prisma.conversation.create({
        data: {
            userId,
            title: payload.title || payload.messages[0].content.slice(0, 60),
            projectId: payload.projectId ?? null,
            messages: toJson(payload.messages),
            importMetadata: payload.importMetadata ? toJson(payload.importMetadata) : undefined,
        },
    });
};

export const getConversationMessages = async (userId: string, conversationId: string) => {
    const conversation = await getConversationById(userId, conversationId);
    return conversation.messages;
};
