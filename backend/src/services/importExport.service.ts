import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";
import { appendConversationMessages } from "./conversation.service";
import { upsertMemoriesFromUserMessage, exportMemoryEntries } from "./memory.service";
import { refreshConversationInsight } from "./conversationInsights.service";

interface ParsedConversation {
    title: string;
    messages: Array<{
        role: "user" | "assistant";
        content: string;
        timestamp: string;
    }>;
}

const toJson = (value: unknown): Prisma.InputJsonValue => {
    return value as Prisma.InputJsonValue;
};

const hashFingerprint = (value: unknown): string => {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
};

const parseMarkdownFallback = (rawText: string): ParsedConversation[] => {
    const lines = rawText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return [];
    }

    const messages = lines.map((line, index) => ({
        role: (index % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: line,
        timestamp: new Date().toISOString(),
    }));

    return [
        {
            title: lines[0].slice(0, 80) || "Imported conversation",
            messages,
        },
    ];
};

const parseJsonImport = (payload: unknown): ParsedConversation[] => {
    if (Array.isArray(payload)) {
        if (payload.length > 0 && typeof payload[0] === "object") {
            return payload
                .map((item, index) => {
                    const record = item as Record<string, unknown>;
                    const rawMessages = Array.isArray(record.messages)
                        ? record.messages
                        : Array.isArray(record.conversation)
                        ? record.conversation
                        : [];

                    const normalizedMessages = rawMessages
                        .map((message) => {
                            const entry = message as Record<string, unknown>;
                            return {
                                role: (
                                    entry.role === "assistant" || entry.role === "model"
                                        ? "assistant"
                                        : "user"
                                ) as "user" | "assistant",
                                content: String(
                                    entry.content ??
                                        entry.text ??
                                        entry.message ??
                                        ""
                                ),
                                timestamp: String(
                                    entry.timestamp ?? new Date().toISOString()
                                ),
                            };
                        })
                        .filter((message) => message.content.trim().length > 0);

                    return {
                        title:
                            String(record.title ?? record.name ?? "").trim() ||
                            `Imported conversation ${index + 1}`,
                        messages: normalizedMessages,
                    };
                })
                .filter((conversation) => conversation.messages.length > 0);
        }

        return [];
    }

    if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;

        if (Array.isArray(record.conversations)) {
            return parseJsonImport(record.conversations);
        }

        if (Array.isArray(record.messages)) {
            return [
                {
                    title: String(record.title ?? "Imported conversation"),
                    messages: parseJsonImport([record])[0]?.messages ?? [],
                },
            ];
        }
    }

    return [];
};

const parseImportPayload = (rawInput: string): ParsedConversation[] => {
    try {
        const parsed = JSON.parse(rawInput);
        const parsedConversations = parseJsonImport(parsed);

        if (parsedConversations.length > 0) {
            return parsedConversations;
        }
    } catch {
        // Continue to markdown/text fallback.
    }

    return parseMarkdownFallback(rawInput);
};

const buildConversationPreview = (conversations: ParsedConversation[]) => {
    return conversations.map((conversation) => ({
        title: conversation.title,
        messageCount: conversation.messages.length,
        sample: conversation.messages.slice(0, 3),
    }));
};

export const previewImport = async (payload: {
    raw: string;
    sourceType?: string;
}) => {
    const conversations = parseImportPayload(payload.raw);

    return {
        sourceType: payload.sourceType ?? "unknown",
        conversationCount: conversations.length,
        previews: buildConversationPreview(conversations),
        candidateMemories: conversations
            .flatMap((conversation) =>
                conversation.messages
                    .filter((message) => message.role === "user")
                    .slice(0, 2)
                    .map((message) => message.content)
            )
            .slice(0, 10),
    };
};

export const importUserData = async (payload: {
    userId: string;
    raw: string;
    sourceType?: string;
    mode: "preview" | "import";
}) => {
    const parsedConversations = parseImportPayload(payload.raw);

    if (payload.mode === "preview") {
        return previewImport({
            raw: payload.raw,
            sourceType: payload.sourceType,
        });
    }

    if (parsedConversations.length === 0) {
        throw new AppError("No conversations found in import payload", 400, "INVALID_IMPORT");
    }

    const contentFingerprint = hashFingerprint({
        sourceType: payload.sourceType,
        conversations: parsedConversations,
    });

    const existingSession = await prisma.importSession.findUnique({
        where: {
            userId_contentFingerprint: {
                userId: payload.userId,
                contentFingerprint,
            },
        },
    });

    if (existingSession) {
        return {
            imported: false,
            message: "This import payload was already processed",
            sessionId: existingSession.id,
            importResult: existingSession.importResult,
        };
    }

    const importedConversationIds: string[] = [];

    for (const conversation of parsedConversations) {
        const conversationFingerprint = hashFingerprint({
            title: conversation.title,
            firstMessage: conversation.messages[0]?.content ?? "",
            messageCount: conversation.messages.length,
        });

        const duplicateConversation = await prisma.conversation.findFirst({
            where: {
                userId: payload.userId,
                title: conversation.title,
            },
        });

        if (duplicateConversation) {
            continue;
        }

        const createdConversation = await appendConversationMessages(payload.userId, {
            title: conversation.title,
            messages: conversation.messages,
            importMetadata: {
                sourceType: payload.sourceType ?? "unknown",
                conversationFingerprint,
            },
        });

        importedConversationIds.push(createdConversation.id);

        for (const message of conversation.messages) {
            if (message.role === "user") {
                await upsertMemoriesFromUserMessage(payload.userId, message.content, {
                    conversationId: createdConversation.id,
                    sourceType: payload.sourceType ?? "unknown",
                });
            }
        }

        await refreshConversationInsight(createdConversation.id);
    }

    const session = await prisma.importSession.create({
        data: {
            userId: payload.userId,
            contentFingerprint,
            mode: payload.mode,
            sourceType: payload.sourceType,
            preview: toJson(buildConversationPreview(parsedConversations)),
            importResult: toJson({
                importedConversationIds,
                importedCount: importedConversationIds.length,
            }),
        },
    });

    return {
        imported: true,
        sessionId: session.id,
        importedConversationIds,
        importedCount: importedConversationIds.length,
    };
};

export const exportUserBundle = async (
    userId: string,
    format: "normalized" | "markdown" | "adapter"
) => {
    const conversations = await prisma.conversation.findMany({
        where: {
            userId,
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    const memories = await exportMemoryEntries(userId, format === "normalized" ? "json" : "adapter");

    if (format === "normalized") {
        return {
            userId,
            exportedAt: new Date().toISOString(),
            conversations,
            memories,
        };
    }

    if (format === "adapter") {
        return {
            adapter: "chatsphere-v1",
            exportedAt: new Date().toISOString(),
            data: {
                conversations,
                memories,
            },
        };
    }

    const markdownSections: string[] = [];

    markdownSections.push(`# ChatSphere Export (${new Date().toISOString()})`);

    for (const conversation of conversations) {
        markdownSections.push(`\n## ${conversation.title}`);

        const messages = Array.isArray(conversation.messages)
            ? conversation.messages
            : [];

        for (const message of messages as Array<Record<string, unknown>>) {
            markdownSections.push(
                `- ${String(message.role ?? "user")}: ${String(message.content ?? "")}`
            );
        }
    }

    return markdownSections.join("\n");
};

export const exportRoomMessages = async (
    userId: string,
    roomId: string,
    format: "json" | "markdown"
) => {
    const membership = await prisma.roomMember.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId,
            },
        },
    });

    if (!membership) {
        throw new AppError("Only room members can export room messages", 403, "FORBIDDEN");
    }

    const messages = await prisma.message.findMany({
        where: {
            roomId,
            isDeleted: false,
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    if (format === "json") {
        return messages;
    }

    return messages
        .map((message) => `- [${message.createdAt.toISOString()}] ${message.username}: ${message.content}`)
        .join("\n");
};

export const exportConversation = async (
    userId: string,
    conversationId: string,
    format: "json" | "markdown"
) => {
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId,
        },
    });

    if (!conversation) {
        throw new AppError("Conversation not found", 404, "NOT_FOUND");
    }

    if (format === "json") {
        return conversation;
    }

    const messages = Array.isArray(conversation.messages)
        ? conversation.messages
        : [];

    const rows = messages.map((message) => {
        const entry = message as Record<string, unknown>;
        return `- ${String(entry.role ?? "user")}: ${String(entry.content ?? "")}`;
    });

    return [`# ${conversation.title}`, "", ...rows].join("\n");
};
