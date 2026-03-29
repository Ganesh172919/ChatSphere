import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "./env";
import { logger } from "../helpers/logger";

declare global {
    var __chatspherePrisma: PrismaClient | undefined;
    var __chatspherePgPool: Pool | undefined;
}

const pgPool =
    global.__chatspherePgPool ??
    new Pool({
        connectionString: env.databaseUrl,
    });

if (!env.isProduction) {
    global.__chatspherePgPool = pgPool;
}

const prismaAdapter = new PrismaPg(pgPool);

export const prisma =
    global.__chatspherePrisma ??
    new PrismaClient({
        adapter: prismaAdapter,
        log: env.isProduction ? ["error"] : ["error", "warn"],
    });

if (!env.isProduction) {
    global.__chatspherePrisma = prisma;
}

export const connectPrisma = async (): Promise<void> => {
    await prisma.$connect();
    logger.info("Database connection established");
};

export const disconnectPrisma = async (): Promise<void> => {
    await prisma.$disconnect();
    await pgPool.end();
    logger.info("Database connection closed");
};
