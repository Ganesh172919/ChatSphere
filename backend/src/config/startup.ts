import { validateStartupEnv } from "./env";
import { logger } from "../helpers/logger";
import { connectPrisma } from "./prisma";
import { cleanupExpiredRefreshTokens } from "../services/auth.service";
import { refreshPromptCatalog } from "../services/promptCatalog.service";
import { refreshModelCatalog } from "../services/ai/gemini.service";

export const runStartupChecks = async () => {
    validateStartupEnv();

    logger.info("Starting ChatSphere backend", {
        stage: "startup",
    });

    await connectPrisma();

    await cleanupExpiredRefreshTokens();

    try {
        await refreshPromptCatalog();
    } catch (error) {
        logger.warn("Prompt catalog refresh failed at startup", { error });
    }

    try {
        await refreshModelCatalog(true);
    } catch (error) {
        logger.warn("AI model catalog refresh failed at startup", { error });
    }

    logger.info("Startup checks completed", {
        stage: "ready",
    });
};
