import { InsightScopeType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../helpers/logger";
import { sendAiMessage } from "./ai/gemini.service";
import { getPromptTemplate, interpolatePromptTemplate } from "./promptCatalog.service";

interface InsightPayload {
    title: string;
    summary: string;
    intent?: string;
    topics: string[];
    decisions: string[];
    actionItems: string[];
    messageCount: number;
}

const scopeKeyForConversation = (conversationId: string): string => {
    return `conversation:${conversationId}`;
};

const scopeKeyForRoom = (roomId: string): string => {
    return `room:${roomId}`;
};

const parseInsightJson = (value: string): InsightPayload | null => {
    try {
        const parsed = JSON.parse(value);

        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        return {
            title: typeof parsed.title === "string" ? parsed.title : "Conversation Insight",
            summary: typeof parsed.summary === "string" ? parsed.summary : "No summary available",
            intent: typeof parsed.intent === "string" ? parsed.intent : undefined,
            topics: Array.isArray(parsed.topics)
                ? parsed.topics.map((topic: unknown) => String(topic))
                : [],
            decisions: Array.isArray(parsed.decisions)
                ? parsed.decisions.map((item: unknown) => String(item))
                : [],
            actionItems: Array.isArray(parsed.actionItems)
                ? parsed.actionItems.map((item: unknown) => String(item))
                : [],
            messageCount:
                typeof parsed.messageCount === "number" ? parsed.messageCount : 0,
        };
    } catch {
        return null;
    }
};

const deterministicInsight = (
    sourceText: string,
    messageCount: number
): InsightPayload => {
    const compact = sourceText.replace(/\s+/g, " ").trim();

    return {
        title: "Conversation Insight",
        summary: compact.slice(0, 320) || "No content available",
        intent: "General discussion",
        topics: [],
        decisions: [],
        actionItems: [],
        messageCount,
    };
};

const upsertInsight = async (
    scopeType: InsightScopeType,
    scopeKey: string,
    payload: InsightPayload
) => {
    return prisma.conversationInsight.upsert({
        where: {
            scopeKey,
        },
        create: {
            scopeType,
            scopeKey,
            title: payload.title,
            summary: payload.summary,
            intent: payload.intent,
            topics: payload.topics,
            decisions: payload.decisions,
            actionItems: payload.actionItems,
            messageCount: payload.messageCount,
            lastGeneratedAt: new Date(),
        },
        update: {
            title: payload.title,
            summary: payload.summary,
            intent: payload.intent,
            topics: payload.topics,
            decisions: payload.decisions,
            actionItems: payload.actionItems,
            messageCount: payload.messageCount,
            lastGeneratedAt: new Date(),
        },
    });
};

const normalizeConversationMessages = (
    messages: unknown
): Array<{ role: string; content: string }> => {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => {
            const record = entry as Record<string, unknown>;
            return {
                role: String(record.role ?? "user"),
                content: String(record.content ?? ""),
            };
        })
        .filter((entry) => entry.content.trim().length > 0);
};

const buildInsightPayload = async (
    text: string,
    messageCount: number
): Promise<InsightPayload> => {
    try {
        const template = await getPromptTemplate("conversation-insight");
        const prompt = interpolatePromptTemplate(template.content, {
            message: text,
        });

        const response = await sendAiMessage({
            task: "insight",
            message: prompt,
            outputJson: true,
        });

        const parsed = parseInsightJson(response.content);

        if (parsed) {
            return {
                ...parsed,
                messageCount,
            };
        }
    } catch (error) {
        logger.warn("AI insight generation failed. Falling back deterministically.", {
            error,
        });
    }

    return deterministicInsight(text, messageCount);
};

export const refreshConversationInsight = async (conversationId: string) => {
    const conversation = await prisma.conversation.findUnique({
        where: {
            id: conversationId,
        },
    });

    if (!conversation) {
        return null;
    }

    const messages = normalizeConversationMessages(conversation.messages);
    const text = messages.map((item) => `${item.role}: ${item.content}`).join("\n");
    const payload = await buildInsightPayload(text, messages.length);

    return upsertInsight(
        InsightScopeType.CONVERSATION,
        scopeKeyForConversation(conversationId),
        payload
    );
};

export const refreshRoomInsight = async (roomId: string) => {
    const messages = await prisma.message.findMany({
        where: {
            roomId,
            isDeleted: false,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 200,
    });

    const text = messages
        .reverse()
        .map((message) => `${message.username}: ${message.content}`)
        .join("\n");

    const payload = await buildInsightPayload(text, messages.length);

    return upsertInsight(InsightScopeType.ROOM, scopeKeyForRoom(roomId), payload);
};

export const getInsight = async (
    scopeType: InsightScopeType | "CONVERSATION" | "ROOM",
    scopeId: string
): Promise<InsightPayload | null> => {
    const scopeTypeValue = String(scopeType);
    const normalizedScopeType =
        scopeTypeValue === "CONVERSATION"
            ? InsightScopeType.CONVERSATION
            : InsightScopeType.ROOM;

    const scopeKey =
        normalizedScopeType === InsightScopeType.CONVERSATION
            ? scopeKeyForConversation(scopeId)
            : scopeKeyForRoom(scopeId);

    const existing = await prisma.conversationInsight.findUnique({
        where: {
            scopeKey,
        },
    });

    if (!existing) {
        if (normalizedScopeType === InsightScopeType.CONVERSATION) {
            const generated = await refreshConversationInsight(scopeId);

            if (!generated) {
                return null;
            }

            return {
                title: generated.title,
                summary: generated.summary,
                intent: generated.intent ?? undefined,
                topics: Array.isArray(generated.topics)
                    ? generated.topics.map((topic) => String(topic))
                    : [],
                decisions: Array.isArray(generated.decisions)
                    ? generated.decisions.map((item) => String(item))
                    : [],
                actionItems: Array.isArray(generated.actionItems)
                    ? generated.actionItems.map((item) => String(item))
                    : [],
                messageCount: generated.messageCount,
            };
        }

        const generated = await refreshRoomInsight(scopeId);

        if (!generated) {
            return null;
        }

        return {
            title: generated.title,
            summary: generated.summary,
            intent: generated.intent ?? undefined,
            topics: Array.isArray(generated.topics)
                ? generated.topics.map((topic) => String(topic))
                : [],
            decisions: Array.isArray(generated.decisions)
                ? generated.decisions.map((item) => String(item))
                : [],
            actionItems: Array.isArray(generated.actionItems)
                ? generated.actionItems.map((item) => String(item))
                : [],
            messageCount: generated.messageCount,
        };
    }

    return {
        title: existing.title,
        summary: existing.summary,
        intent: existing.intent ?? undefined,
        topics: Array.isArray(existing.topics)
            ? existing.topics.map((topic) => String(topic))
            : [],
        decisions: Array.isArray(existing.decisions)
            ? existing.decisions.map((item) => String(item))
            : [],
        actionItems: Array.isArray(existing.actionItems)
            ? existing.actionItems.map((item) => String(item))
            : [],
        messageCount: existing.messageCount,
    };
};
