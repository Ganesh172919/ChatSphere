import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";
import { logger } from "../helpers/logger";
import { sendAiMessage } from "./ai/gemini.service";
import {
    appendConversationMessages,
    getConversationById,
} from "./conversation.service";
import {
    getRelevantMemories,
    markMemoriesUsed,
    upsertMemoriesFromUserMessage,
} from "./memory.service";
import {
    getInsight,
    refreshConversationInsight,
} from "./conversationInsights.service";

interface SoloChatInput {
    userId: string;
    message: string;
    conversationId?: string;
    modelId?: string;
    projectId?: string;
    attachment?: {
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
        textContent?: string;
        base64?: string;
    };
}

const normalizeConversationHistory = (
    messages: unknown
): Array<{ role: "user" | "assistant"; content: string }> => {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .map((entry) => {
            const record = entry as Record<string, unknown>;
            return {
                role: (record.role === "assistant" ? "assistant" : "user") as
                    | "assistant"
                    | "user",
                content: String(record.content ?? ""),
            };
        })
        .filter((entry) => entry.content.trim().length > 0)
        .slice(-18);
};

export const handleSoloChat = async (input: SoloChatInput) => {
    const userMessage = input.message.trim();

    if (userMessage.length === 0) {
        throw new AppError("Message is required", 400, "VALIDATION_ERROR");
    }

    let existingConversation:
        | {
              id: string;
              projectId: string | null;
              messages: unknown;
          }
        | undefined;

    if (input.conversationId) {
        const conversation = await getConversationById(input.userId, input.conversationId);
        existingConversation = {
            id: conversation.id,
            projectId: conversation.project?.id ?? null,
            messages: conversation.messages,
        };
    }

    let selectedProjectId = input.projectId ?? existingConversation?.projectId ?? undefined;

    if (input.projectId && existingConversation?.projectId && input.projectId !== existingConversation.projectId) {
        throw new AppError(
            "Conversation project mismatch",
            400,
            "PROJECT_MISMATCH"
        );
    }

    let projectContext: {
        id: string;
        name: string;
        description: string | null;
        instructions: string | null;
        context: string | null;
    } | null = null;

    if (selectedProjectId) {
        const project = await prisma.project.findFirst({
            where: {
                id: selectedProjectId,
                userId: input.userId,
            },
            select: {
                id: true,
                name: true,
                description: true,
                instructions: true,
                context: true,
            },
        });

        if (!project) {
            throw new AppError("Project not found", 404, "NOT_FOUND");
        }

        projectContext = project;
    }

    const relevantMemories = await getRelevantMemories(input.userId, userMessage, 6);
    const memoryIds = relevantMemories.map((memory) => memory.id);

    const existingInsight = input.conversationId
        ? await getInsight("CONVERSATION", input.conversationId)
        : null;

    const history = existingConversation
        ? normalizeConversationHistory(existingConversation.messages)
        : [];

    const promptParts = [userMessage];

    if (projectContext) {
        promptParts.push(
            `Project: ${projectContext.name}`,
            projectContext.description ?? "",
            projectContext.instructions ?? "",
            projectContext.context ?? ""
        );
    }

    if (relevantMemories.length > 0) {
        promptParts.push(
            `Relevant memory: ${relevantMemories
                .map((memory) => memory.summary)
                .join(" | ")}`
        );
    }

    if (existingInsight) {
        promptParts.push(`Conversation insight: ${existingInsight.summary}`);
    }

    const aiResponse = await sendAiMessage({
        task: "chat",
        message: promptParts.filter(Boolean).join("\n"),
        history: history.map((entry) => ({
            role: entry.role,
            content: entry.content,
        })),
        modelId: input.modelId,
        attachment: input.attachment,
    });

    const now = new Date().toISOString();

    const conversation = await appendConversationMessages(input.userId, {
        conversationId: input.conversationId,
        title: userMessage.slice(0, 80),
        projectId: selectedProjectId ?? null,
        messages: [
            {
                role: "user",
                content: userMessage,
                timestamp: now,
                memoryRefs: memoryIds,
                file: input.attachment,
            },
            {
                role: "assistant",
                content: aiResponse.content,
                timestamp: now,
                memoryRefs: memoryIds,
                modelTelemetry: aiResponse.telemetry as Record<string, unknown>,
            },
        ],
    });

    await upsertMemoriesFromUserMessage(input.userId, userMessage, {
        conversationId: conversation.id,
        timestamp: now,
    });

    await markMemoriesUsed(memoryIds);

    void refreshConversationInsight(conversation.id).catch((error) => {
        logger.warn("Conversation insight refresh failed", {
            conversationId: conversation.id,
            error,
        });
    });

    const updatedInsight = await getInsight("CONVERSATION", conversation.id);

    return {
        conversationId: conversation.id,
        content: aiResponse.content,
        memoryRefs: memoryIds,
        insight: updatedInsight,
        model: aiResponse.model,
        usage: aiResponse.usage,
        telemetry: aiResponse.telemetry,
    };
};
