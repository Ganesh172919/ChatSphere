import { NextFunction, Request, Response } from "express";
import { AppError } from "../helpers/errors";
import { verifyAccessToken } from "../services/token.service";

export type AuthRequest = Request & {
    user: NonNullable<Request["user"]>;
};

export const protect = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    const token = authHeader.slice("Bearer ".length);

    try {
        req.user = verifyAccessToken(token);
        next();
    } catch (_error) {
        next(new AppError("Invalid or expired token", 401, "UNAUTHORIZED"));
    }
};