import { prisma } from "../config/prisma";

interface PromptTemplateDefinition {
    key: string;
    description: string;
    content: string;
}

const DEFAULT_TEMPLATES: Record<string, PromptTemplateDefinition> = {
    "solo-chat": {
        key: "solo-chat",
        description: "General solo AI assistant conversation template",
        content:
            "You are ChatSphere assistant. Use provided memory and insight when relevant. User message: {{message}}",
    },
    "group-chat": {
        key: "group-chat",
        description: "Room-level AI assistant template",
        content:
            "You are ChatSphere room assistant for room {{roomName}}. Keep context concise and actionable. User message: {{message}}",
    },
    "memory-extract": {
        key: "memory-extract",
        description: "Extract memory candidates from user text",
        content:
            "Extract durable user memories as JSON array from this text: {{message}}",
    },
    "conversation-insight": {
        key: "conversation-insight",
        description: "Generate structured conversation insights",
        content:
            "Generate summary, intent, topics, decisions, and action items for: {{message}}",
    },
    "smart-replies": {
        key: "smart-replies",
        description: "Generate quick reply suggestions",
        content:
            "Generate 3 concise smart replies for this message: {{message}}",
    },
    sentiment: {
        key: "sentiment",
        description: "Classify sentiment",
        content: "Classify sentiment and explain briefly for: {{message}}",
    },
    grammar: {
        key: "grammar",
        description: "Grammar enhancement",
        content: "Improve grammar without changing intent: {{message}}",
    },
};

let cachedTemplates = new Map<string, PromptTemplateDefinition>();

const ensureDefaultsLoaded = (): void => {
    if (cachedTemplates.size > 0) {
        return;
    }

    for (const value of Object.values(DEFAULT_TEMPLATES)) {
        cachedTemplates.set(value.key, value);
    }
};

export const refreshPromptCatalog = async (): Promise<void> => {
    ensureDefaultsLoaded();

    const activeTemplates = await prisma.promptTemplate.findMany({
        where: {
            isActive: true,
        },
        orderBy: [
            {
                key: "asc",
            },
            {
                version: "desc",
            },
        ],
    });

    for (const dbTemplate of activeTemplates) {
        if (!cachedTemplates.has(dbTemplate.key)) {
            cachedTemplates.set(dbTemplate.key, {
                key: dbTemplate.key,
                description: dbTemplate.description ?? "",
                content: dbTemplate.content,
            });
            continue;
        }

        const existing = cachedTemplates.get(dbTemplate.key);

        if (existing) {
            cachedTemplates.set(dbTemplate.key, {
                key: dbTemplate.key,
                description: dbTemplate.description ?? existing.description,
                content: dbTemplate.content,
            });
        }
    }
};

export const getPromptTemplate = async (key: string): Promise<PromptTemplateDefinition> => {
    ensureDefaultsLoaded();

    if (!cachedTemplates.has(key)) {
        await refreshPromptCatalog();
    }

    const template = cachedTemplates.get(key);

    if (!template) {
        return {
            key,
            description: "Fallback prompt template",
            content: "{{message}}",
        };
    }

    return template;
};

export const interpolatePromptTemplate = (
    content: string,
    variables: Record<string, string>
): string => {
    return Object.entries(variables).reduce((accumulator, [key, value]) => {
        const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        return accumulator.replace(placeholder, value);
    }, content);
};

export const buildInitialRoomAiHistory = async (
    roomName: string
): Promise<Array<{ role: "system" | "assistant"; content: string }>> => {
    const groupTemplate = await getPromptTemplate("group-chat");

    return [
        {
            role: "system",
            content: interpolatePromptTemplate(groupTemplate.content, {
                roomName,
                message: "",
            }),
        },
        {
            role: "assistant",
            content: `I am ready to assist room ${roomName}.`,
        },
    ];
};

export const listPromptTemplates = async () => {
    return prisma.promptTemplate.findMany({
        orderBy: [
            {
                key: "asc",
            },
            {
                version: "desc",
            },
        ],
    });
};

export const upsertPromptTemplate = async (payload: {
    key: string;
    version?: number;
    description?: string;
    content: string;
    isActive?: boolean;
}) => {
    const version = payload.version ?? 1;

    return prisma.promptTemplate.upsert({
        where: {
            key_version: {
                key: payload.key,
                version,
            },
        },
        create: {
            key: payload.key,
            version,
            description: payload.description,
            content: payload.content,
            isActive: payload.isActive ?? true,
        },
        update: {
            description: payload.description,
            content: payload.content,
            isActive: payload.isActive ?? true,
        },
    });
};
