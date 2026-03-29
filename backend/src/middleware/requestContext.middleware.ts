import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { logger } from "../helpers/logger";

export const requestContext = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const incomingRequestId = req.header("x-request-id");
    req.requestId = incomingRequestId?.trim() || randomUUID();

    const start = Date.now();

    logger.info("Incoming request", {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
    });

    res.on("finish", () => {
        logger.info("Request completed", {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
        });
    });

    next();
};
