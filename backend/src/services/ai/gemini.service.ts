import { env } from "../../config/env";
import { logger } from "../../helpers/logger";

type AiRole = "system" | "user" | "assistant";

type AiComplexity = "low" | "medium" | "high";

interface AiHistoryItem {
    role: AiRole;
    content: string;
}

interface AttachmentPayload {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    base64?: string;
    textContent?: string;
}

interface SendAiMessageInput {
    task: "chat" | "memory" | "insight" | "smart-replies" | "sentiment" | "grammar";
    message: string;
    history?: AiHistoryItem[];
    modelId?: string;
    attachment?: AttachmentPayload;
    outputJson?: boolean;
}

interface ModelDefinition {
    id: string;
    provider: "openrouter" | "gemini" | "grok" | "groq" | "together" | "huggingface";
    label: string;
    supportsImages: boolean;
    supportsJson: boolean;
}

interface SendAiMessageResult {
    content: string;
    model: {
        provider: string;
        id: string;
        label: string;
    };
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    telemetry: {
        provider: string;
        selectedModel: string;
        fallbackUsed: boolean;
        complexity: AiComplexity;
        processingMs: number;
        category: "provider" | "fallback";
    };
}

interface CatalogState {
    models: ModelDefinition[];
    refreshedAt: number;
}

const MODEL_CATALOG_TTL_MS = 10 * 60 * 1000;

const catalogState: CatalogState = {
    models: [],
    refreshedAt: 0,
};

const parseOpenRouterModels = (): ModelDefinition[] => {
    if (!env.openRouterModels.trim()) {
        return [
            {
                id: env.openRouterDefaultModel,
                provider: "openrouter",
                label: "OpenRouter Default",
                supportsImages: true,
                supportsJson: true,
            },
        ];
    }

    const rows = env.openRouterModels
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

    const parsed: ModelDefinition[] = [];

    for (const row of rows) {
        const [id, label] = row.split("=").map((part) => part.trim());

        if (!id) {
            continue;
        }

        parsed.push({
            id,
            provider: "openrouter",
            label: label || id,
            supportsImages: true,
            supportsJson: true,
        });
    }

    return parsed;
};

const providerModelDefaults = (): ModelDefinition[] => {
    return [
        {
            id: env.geminiModel,
            provider: "gemini",
            label: "Gemini",
            supportsImages: true,
            supportsJson: true,
        },
        {
            id: env.grokModel,
            provider: "grok",
            label: "Grok",
            supportsImages: true,
            supportsJson: true,
        },
        {
            id: env.groqModel,
            provider: "groq",
            label: "Groq",
            supportsImages: false,
            supportsJson: true,
        },
        {
            id: env.togetherModel,
            provider: "together",
            label: "Together",
            supportsImages: false,
            supportsJson: true,
        },
        {
            id: env.huggingFaceModel,
            provider: "huggingface",
            label: "HuggingFace",
            supportsImages: false,
            supportsJson: false,
        },
    ];
};

const isProviderEnabled = (provider: ModelDefinition["provider"]): boolean => {
    switch (provider) {
        case "openrouter":
            return Boolean(env.openRouterApiKey);
        case "gemini":
            return Boolean(env.geminiApiKey);
        case "grok":
            return Boolean(env.grokApiKey);
        case "groq":
            return Boolean(env.groqApiKey);
        case "together":
            return Boolean(env.togetherApiKey);
        case "huggingface":
            return Boolean(env.huggingFaceApiKey);
        default:
            return false;
    }
};

const filterUnsupportedModels = (models: ModelDefinition[]): ModelDefinition[] => {
    return models.filter((model) => Boolean(model.id?.trim()));
};

export const refreshModelCatalog = async (force = false): Promise<ModelDefinition[]> => {
    const now = Date.now();

    if (!force && now - catalogState.refreshedAt < MODEL_CATALOG_TTL_MS && catalogState.models.length > 0) {
        return catalogState.models;
    }

    try {
        const models = filterUnsupportedModels([
            ...parseOpenRouterModels(),
            ...providerModelDefaults(),
        ]);

        catalogState.models = models;
        catalogState.refreshedAt = now;

        logger.info("AI model catalog refreshed", {
            count: models.length,
        });

        return models;
    } catch (error) {
        logger.warn("Failed to refresh model catalog", {
            error,
        });

        return catalogState.models;
    }
};

export const getModelCatalog = async (): Promise<ModelDefinition[]> => {
    return refreshModelCatalog(false);
};

const estimateComplexity = (message: string): AiComplexity => {
    const normalized = message.trim();

    if (normalized.length > 1000 || /architecture|refactor|analysis|plan|design/i.test(normalized)) {
        return "high";
    }

    if (normalized.length > 250) {
        return "medium";
    }

    return "low";
};

const providerFallbackOrder: ModelDefinition["provider"][] = [
    "openrouter",
    "gemini",
    "grok",
    "groq",
    "together",
    "huggingface",
];

export const resolveTaskModel = async (
    task: SendAiMessageInput["task"],
    message: string,
    requestedModelId?: string
): Promise<{ complexity: AiComplexity; chain: ModelDefinition[] }> => {
    const catalog = await getModelCatalog();
    const complexity = estimateComplexity(message);

    if (requestedModelId) {
        const requested = catalog.find((entry) => entry.id === requestedModelId);

        if (requested) {
            return {
                complexity,
                chain: [requested, ...catalog.filter((entry) => entry.id !== requestedModelId)],
            };
        }
    }

    const byProvider = [...catalog].sort((a, b) => {
        return providerFallbackOrder.indexOf(a.provider) - providerFallbackOrder.indexOf(b.provider);
    });

    const priority = byProvider.filter((entry) => {
        if (task === "insight" || task === "memory") {
            return entry.supportsJson;
        }

        if (complexity === "high") {
            return entry.provider === "openrouter" || entry.provider === "gemini";
        }

        return true;
    });

    if (priority.length === 0) {
        return {
            complexity,
            chain: byProvider,
        };
    }

    return {
        complexity,
        chain: priority,
    };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await promise;
    } finally {
        clearTimeout(timeout);
    }
};

const normalizeProviderError = (error: unknown): {
    category: "rate_limit" | "model_unavailable" | "credit_exhausted" | "transient";
    message: string;
} => {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes("429") || message.includes("rate")) {
            return {
                category: "rate_limit",
                message: "Provider rate limited",
            };
        }

        if (message.includes("model") && message.includes("not")) {
            return {
                category: "model_unavailable",
                message: "Model unavailable",
            };
        }

        if (message.includes("credit") || message.includes("quota")) {
            return {
                category: "credit_exhausted",
                message: "Provider credit exhausted",
            };
        }
    }

    return {
        category: "transient",
        message: "Transient provider failure",
    };
};

const buildAttachmentNote = (attachment?: AttachmentPayload): string => {
    if (!attachment) {
        return "";
    }

    const fileType = (attachment.fileType ?? "").toLowerCase();
    const details: string[] = [];

    if (attachment.fileName) {
        details.push(`file: ${attachment.fileName}`);
    }

    if (attachment.fileSize) {
        details.push(`size: ${attachment.fileSize}`);
    }

    if (fileType.includes("pdf")) {
        details.push("pdf metadata attached");
    }

    if (attachment.textContent && /text|json|xml|javascript|typescript|csv|markdown/.test(fileType)) {
        details.push(`inline text: ${attachment.textContent.slice(0, 1800)}`);
    }

    if (attachment.base64 && /image\/(png|jpeg|jpg|gif|webp)/.test(fileType)) {
        details.push("image payload attached as base64");
    }

    if (details.length === 0) {
        return "";
    }

    return `\nAttachment context: ${details.join("; ")}`;
};

const deterministicFallback = (input: SendAiMessageInput): string => {
    if (input.task === "smart-replies") {
        return JSON.stringify([
            "Sounds good. I can help with that.",
            "Can you share one more detail so I can be precise?",
            "I can draft a clean next step if you want.",
        ]);
    }

    if (input.task === "sentiment") {
        return JSON.stringify({
            label: "neutral",
            confidence: 0.51,
            reason: "Fallback sentiment classifier used",
        });
    }

    if (input.task === "grammar") {
        return input.message.trim();
    }

    if (input.outputJson) {
        return JSON.stringify({
            summary: "AI provider unavailable, fallback summary used.",
            topics: [],
            decisions: [],
            actionItems: [],
        });
    }

    return "I could not reach the configured AI providers right now. Please try again shortly.";
};

const callOpenRouter = async (
    model: ModelDefinition,
    history: AiHistoryItem[],
    message: string,
    attachmentNote: string
): Promise<string> => {
    if (!env.openRouterApiKey) {
        throw new Error("OpenRouter API key not configured");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.openRouterApiKey}`,
        },
        body: JSON.stringify({
            model: model.id,
            messages: [
                ...history.map((item) => ({
                    role: item.role,
                    content: item.content,
                })),
                {
                    role: "user",
                    content: `${message}${attachmentNote}`,
                },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenRouter failed: ${response.status}`);
    }

    const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content?.trim() || "";
};

const callGemini = async (
    model: ModelDefinition,
    history: AiHistoryItem[],
    message: string,
    attachmentNote: string
): Promise<string> => {
    if (!env.geminiApiKey) {
        throw new Error("Gemini API key not configured");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${env.geminiApiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    ...history.map((item) => ({
                        role: item.role === "assistant" ? "model" : "user",
                        parts: [{ text: item.content }],
                    })),
                    {
                        role: "user",
                        parts: [{ text: `${message}${attachmentNote}` }],
                    },
                ],
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini failed: ${response.status}`);
    }

    const data = (await response.json()) as {
        candidates?: Array<{
            content?: {
                parts?: Array<{
                    text?: string;
                }>;
            };
        }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
};

const callHuggingFace = async (
    model: ModelDefinition,
    message: string
): Promise<string> => {
    if (!env.huggingFaceApiKey) {
        throw new Error("HuggingFace API key not configured");
    }

    const response = await fetch(
        `https://api-inference.huggingface.co/models/${model.id}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.huggingFaceApiKey}`,
            },
            body: JSON.stringify({
                inputs: message,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`HuggingFace failed: ${response.status}`);
    }

    const data = (await response.json()) as Array<{ generated_text?: string }>;

    return data?.[0]?.generated_text?.trim() || "";
};

const callProviderModel = async (
    model: ModelDefinition,
    history: AiHistoryItem[],
    message: string,
    attachment?: AttachmentPayload
): Promise<string> => {
    const attachmentNote = buildAttachmentNote(attachment);

    if (!isProviderEnabled(model.provider)) {
        throw new Error(`Provider ${model.provider} is not configured`);
    }

    switch (model.provider) {
        case "openrouter":
            return callOpenRouter(model, history, message, attachmentNote);
        case "gemini":
            return callGemini(model, history, message, attachmentNote);
        case "huggingface":
            return callHuggingFace(model, `${message}${attachmentNote}`);
        case "grok":
        case "groq":
        case "together":
            // These providers are routed through OpenRouter if directly unavailable.
            return callOpenRouter(
                {
                    ...model,
                    provider: "openrouter",
                },
                history,
                message,
                attachmentNote
            );
        default:
            throw new Error("Unsupported provider");
    }
};

export const sendAiMessage = async (
    input: SendAiMessageInput
): Promise<SendAiMessageResult> => {
    const startedAt = Date.now();
    const history = input.history ?? [];
    const historyText = history.map((item) => item.content).join(" ");
    const { complexity, chain } = await resolveTaskModel(
        input.task,
        input.message,
        input.modelId
    );

    let fallbackUsed = false;

    for (const model of chain) {
        try {
            const content = await withTimeout(
                callProviderModel(model, history, input.message, input.attachment),
                env.requestTimeoutMs
            );

            if (!content.trim()) {
                throw new Error("Provider returned empty content");
            }

            return {
                content,
                model: {
                    provider: model.provider,
                    id: model.id,
                    label: model.label,
                },
                usage: {
                    promptTokens: Math.ceil((input.message.length + historyText.length) / 4),
                    completionTokens: Math.ceil(content.length / 4),
                    totalTokens:
                        Math.ceil((input.message.length + historyText.length) / 4) +
                        Math.ceil(content.length / 4),
                },
                telemetry: {
                    provider: model.provider,
                    selectedModel: model.id,
                    fallbackUsed,
                    complexity,
                    processingMs: Date.now() - startedAt,
                    category: "provider",
                },
            };
        } catch (error) {
            const normalizedError = normalizeProviderError(error);
            logger.warn("AI provider call failed", {
                provider: model.provider,
                modelId: model.id,
                category: normalizedError.category,
                message: normalizedError.message,
            });
            fallbackUsed = true;
        }
    }

    const fallbackContent = deterministicFallback(input);

    return {
        content: fallbackContent,
        model: {
            provider: "fallback",
            id: "deterministic-fallback",
            label: "Deterministic fallback",
        },
        usage: {
            promptTokens: Math.ceil(input.message.length / 4),
            completionTokens: Math.ceil(fallbackContent.length / 4),
            totalTokens:
                Math.ceil(input.message.length / 4) + Math.ceil(fallbackContent.length / 4),
        },
        telemetry: {
            provider: "fallback",
            selectedModel: "deterministic-fallback",
            fallbackUsed: true,
            complexity,
            processingMs: Date.now() - startedAt,
            category: "fallback",
        },
    };
};
