import { NextFunction, Request, Response } from "express";
import { AppError } from "../helpers/errors";
import { consumeAiQuota, getAiQuotaKey } from "../services/aiQuota.service";

export const aiQuota = (req: Request, _res: Response, next: NextFunction): void => {
    const key = getAiQuotaKey(req.user?.userId, req.ip);
    const result = consumeAiQuota(key);

    if (!result.allowed) {
        return next(
            new AppError(
                "AI quota exceeded. Please retry later.",
                429,
                "AI_QUOTA_EXCEEDED",
                {
                    remaining: result.remaining,
                },
                result.retryAfterMs
            )
        );
    }

    next();
};
