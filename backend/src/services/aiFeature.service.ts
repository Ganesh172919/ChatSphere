import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";
import { getModelCatalog, sendAiMessage } from "./ai/gemini.service";

const getUserAiSettings = async (userId: string) => {
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

    const settings = user.settings as Record<string, unknown>;
    const aiFeatures =
        settings && typeof settings === "object"
            ? ((settings.aiFeatures as Record<string, unknown>) ?? {})
            : {};

    return {
        smartReplies:
            typeof aiFeatures.smartReplies === "boolean"
                ? aiFeatures.smartReplies
                : true,
        sentiment:
            typeof aiFeatures.sentiment === "boolean" ? aiFeatures.sentiment : true,
        grammar: typeof aiFeatures.grammar === "boolean" ? aiFeatures.grammar : true,
    };
};

const assertFeatureEnabled = async (
    userId: string,
    feature: "smartReplies" | "sentiment" | "grammar"
) => {
    const settings = await getUserAiSettings(userId);

    if (!settings[feature]) {
        throw new AppError("This AI feature is disabled in user settings", 403, "FEATURE_DISABLED");
    }
};

export const listAiModels = async () => {
    const models = await getModelCatalog();

    return {
        auto: {
            id: "auto",
            label: "Automatic routing",
            provider: "router",
        },
        models,
    };
};

export const generateSmartReplies = async (
    userId: string,
    payload: {
        message: string;
        modelId?: string;
    }
) => {
    await assertFeatureEnabled(userId, "smartReplies");

    const response = await sendAiMessage({
        task: "smart-replies",
        message: payload.message,
        modelId: payload.modelId,
        outputJson: true,
    });

    try {
        const replies = JSON.parse(response.content);

        if (Array.isArray(replies)) {
            return {
                replies: replies.map((reply) => String(reply)).slice(0, 5),
                model: response.model,
                usage: response.usage,
            };
        }
    } catch {
        // Fallback below.
    }

    return {
        replies: [response.content],
        model: response.model,
        usage: response.usage,
    };
};

export const analyzeSentiment = async (
    userId: string,
    payload: {
        message: string;
        modelId?: string;
    }
) => {
    await assertFeatureEnabled(userId, "sentiment");

    const response = await sendAiMessage({
        task: "sentiment",
        message: payload.message,
        modelId: payload.modelId,
        outputJson: true,
    });

    try {
        const parsed = JSON.parse(response.content) as {
            label?: string;
            confidence?: number;
            reason?: string;
        };

        return {
            label: parsed.label ?? "neutral",
            confidence:
                typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
            reason: parsed.reason ?? "No reason provided",
            model: response.model,
            usage: response.usage,
        };
    } catch {
        return {
            label: "neutral",
            confidence: 0.5,
            reason: response.content,
            model: response.model,
            usage: response.usage,
        };
    }
};

export const improveGrammar = async (
    userId: string,
    payload: {
        message: string;
        modelId?: string;
    }
) => {
    await assertFeatureEnabled(userId, "grammar");

    const response = await sendAiMessage({
        task: "grammar",
        message: payload.message,
        modelId: payload.modelId,
    });

    return {
        improved: response.content,
        model: response.model,
        usage: response.usage,
    };
};
