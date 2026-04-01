import "dotenv/config";
import "./types/express";
import http from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { fileStorageService } from "./services/files/file-storage.service";
import { createSocketServer } from "./socket";

const bootstrap = async () => {
  await prisma.$connect();
  await fileStorageService.ensureUploadDirectory();

  const app = createApp();
  const server = http.createServer(app);
  createSocketServer(server);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "ChatSphere rebuild server started");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down server");
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
};

void bootstrap().catch(async (error) => {
  logger.error({ err: error }, "Failed to bootstrap application");
  await prisma.$disconnect();
  process.exit(1);
});
