import rateLimit, { ipKeyGenerator, Options } from "express-rate-limit";
import { Request, Response } from "express";
import { env } from "../config/env";

const baseOptions: Partial<Options> = {
    standardHeaders: true,
    legacyHeaders: false,
};

const resolveIdentity = (req: Request): string => {
    if (req.user?.userId) {
        return `user:${req.user.userId}`;
    }

    return ipKeyGenerator(req.ip ?? "unknown");
};

export const authLimiter = rateLimit({
    ...baseOptions,
    windowMs: 15 * 60 * 1000,
    max: env.authRateLimitMax,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
    message: {
        success: false,
        error: {
            code: "AUTH_RATE_LIMITED",
            message: "Too many auth requests. Please try again later.",
        },
    },
});

export const aiLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 1000,
    max: env.aiRateLimitPerMinute,
    keyGenerator: resolveIdentity,
    handler: (req: Request, res: Response) => {
        const resetTime = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit
            ?.resetTime;
        const retryAfterMs = resetTime
            ? Math.max(0, resetTime.getTime() - Date.now())
            : 60_000;

        res.status(429).json({
            success: false,
            error: {
                code: "AI_RATE_LIMITED",
                message: "AI request rate exceeded. Please retry shortly.",
                retryAfterMs,
                requestId: req.requestId,
            },
        });
    },
});

export const apiLimiter = rateLimit({
    ...baseOptions,
    windowMs: 60 * 1000,
    max: 180,
    keyGenerator: resolveIdentity,
    skip: (req: Request) => {
        if (req.path === "/api/health") {
            return true;
        }

        return req.path.startsWith("/api/auth");
    },
    message: {
        success: false,
        error: {
            code: "API_RATE_LIMITED",
            message: "Too many API requests. Please slow down.",
        },
    },
});
