import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError, isAppError } from "../helpers/errors";
import { env } from "../config/env";
import { logger } from "../helpers/logger";

const getPrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
    if (error.code === "P2002") {
        return new AppError("Resource already exists", 409, "CONFLICT", {
            target: error.meta?.target,
        });
    }

    if (error.code === "P2025") {
        return new AppError("Resource not found", 404, "NOT_FOUND");
    }

    return new AppError("Database request failed", 500, "DATABASE_ERROR");
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
    next(new AppError("Route not found", 404, "NOT_FOUND", { path: req.originalUrl }));
};

export const errorHandler = (
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let appError: AppError;

    if (isAppError(error)) {
        appError = error;
    } else if (error instanceof ZodError) {
        appError = new AppError("Validation failed", 400, "VALIDATION_ERROR", error.issues);
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        appError = getPrismaError(error);
    } else {
        appError = new AppError("Internal server error", 500, "INTERNAL_SERVER_ERROR");
    }

    logger.error("Request failed", {
        requestId: req.requestId,
        path: req.originalUrl,
        method: req.method,
        statusCode: appError.statusCode,
        code: appError.code,
        message: appError.message,
        error,
    });

    res.status(appError.statusCode).json({
        success: false,
        error: {
            code: appError.code,
            message: appError.message,
            requestId: req.requestId,
            ...(appError.details ? { details: appError.details } : {}),
            ...(appError.retryAfterMs ? { retryAfterMs: appError.retryAfterMs } : {}),
            ...(!env.isProduction && error instanceof Error ? { stack: error.stack } : {}),
        },
    });
};
