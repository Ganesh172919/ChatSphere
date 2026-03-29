import dotenv from "dotenv";
import path from "path";

dotenv.config();

const parseInteger = (value: string | undefined, fallback: number): number => {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined) {
        return fallback;
    }

    return value.toLowerCase() === "true";
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const accessTokenSecret =
    process.env.JWT_ACCESS_SECRET ?? process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET ?? process.env.REFRESH_TOKEN_SECRET;

export const env = {
    nodeEnv,
    isProduction: nodeEnv === "production",
    port: parseInteger(process.env.PORT, 3000),
    clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
    serverUrl: process.env.SERVER_URL ?? "http://localhost:3000",
    databaseUrl: process.env.DATABASE_URL ?? "",
    accessTokenSecret: accessTokenSecret ?? "",
    refreshTokenSecret: refreshTokenSecret ?? "",
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
    refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
    messageEditWindowMinutes: parseInteger(
        process.env.MESSAGE_EDIT_WINDOW_MINUTES,
        15
    ),
    jsonBodyLimit: "5mb",
    uploadMaxSizeBytes: 5 * 1024 * 1024,
    uploadDirectory: path.join(process.cwd(), "uploads"),
    requestTimeoutMs: parseInteger(process.env.AI_REQUEST_TIMEOUT_MS, 30000),
    aiContextMessageLimit: parseInteger(process.env.AI_CONTEXT_MESSAGE_LIMIT, 18),
    aiQuotaWindowMs: 15 * 60 * 1000,
    aiQuotaMaxRequests: 20,
    aiRateLimitPerMinute: parseInteger(process.env.AI_RATE_LIMIT_PER_MINUTE, 8),
    defaultAiModel: process.env.DEFAULT_AI_MODEL ?? "auto",
    openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
    openRouterDefaultModel:
        process.env.OPENROUTER_DEFAULT_MODEL ?? "openai/gpt-4o-mini",
    openRouterModels: process.env.OPENROUTER_MODELS ?? "",
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    grokApiKey: process.env.GROK_API_KEY ?? process.env.XAI_API_KEY ?? "",
    grokModel: process.env.GROK_MODEL ?? "grok-2-latest",
    groqApiKey: process.env.GROQ_API_KEY ?? "",
    groqModel: process.env.GROQ_MODEL ?? "llama-3.1-70b-versatile",
    togetherApiKey: process.env.TOGETHER_API_KEY ?? "",
    togetherModel: process.env.TOGETHER_MODEL ?? "meta-llama/Llama-3.1-70B-Instruct-Turbo",
    huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY ?? "",
    huggingFaceModel:
        process.env.HUGGINGFACE_MODEL ?? "meta-llama/Llama-3.1-8B-Instruct",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    googleCallbackUrl:
        process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:3000/api/auth/google/callback",
    secureCookies: parseBoolean(process.env.SECURE_COOKIES, nodeEnv === "production"),
    corsCredentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
    socketFloodWindowMs: 10000,
    socketFloodMaxEvents: 60,
};

export const validateStartupEnv = (): void => {
    const missing: string[] = [];

    if (!env.databaseUrl) {
        missing.push("DATABASE_URL");
    }

    if (!env.accessTokenSecret) {
        missing.push("JWT_ACCESS_SECRET (or ACCESS_TOKEN_SECRET)");
    }

    if (!env.refreshTokenSecret) {
        missing.push("JWT_REFRESH_SECRET (or REFRESH_TOKEN_SECRET)");
    }

    if (missing.length > 0) {
        throw new Error(`Missing required environment values: ${missing.join(", ")}`);
    }
};
