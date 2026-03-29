import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { runStartupChecks } from "./config/startup";
import { disconnectPrisma } from "./config/prisma";
import { logger } from "./helpers/logger";
import { initializeSocketServer } from "./socket";

const gracefulShutdown = async (signal: string, server: http.Server) => {
    logger.info("Shutdown signal received", { signal });

    server.close(async () => {
        try {
            await disconnectPrisma();
        } finally {
            process.exit(0);
        }
    });
};

const bootstrap = async () => {
    await runStartupChecks();

    const app = createApp();
    const server = http.createServer(app);

    initializeSocketServer(server);

    server.listen(env.port, () => {
        logger.info("ChatSphere backend started", {
            port: env.port,
            env: env.nodeEnv,
            clientUrl: env.clientUrl,
        });
    });

    process.on("SIGINT", () => {
        void gracefulShutdown("SIGINT", server);
    });

    process.on("SIGTERM", () => {
        void gracefulShutdown("SIGTERM", server);
    });

    process.on("unhandledRejection", (reason) => {
        logger.error("Unhandled promise rejection", {
            reason,
        });
    });

    process.on("uncaughtException", (error) => {
        logger.error("Uncaught exception", {
            error,
        });
    });
};

void bootstrap().catch((error) => {
    logger.error("Bootstrap failed", {
        error,
    });

    process.exit(1);
});