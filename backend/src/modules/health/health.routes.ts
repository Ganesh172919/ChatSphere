import { Router } from "express";
import { prisma } from "../../config/prisma";
import { ok } from "../../helpers/api-response";
import { asyncHandler } from "../../helpers/async-handler";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.json(
        ok({
          status: "ok",
          service: "chatsphere-rebuild",
          timestamp: new Date().toISOString()
        })
      );
    } catch {
      response.status(503).json({
        success: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database connection failed"
        }
      });
    }
  })
);
