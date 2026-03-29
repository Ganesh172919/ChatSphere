import { NextFunction, Request, Response } from "express";
import { AppError } from "../helpers/errors";

export const adminCheck = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!req.user.isAdmin) {
        return next(new AppError("Admin access required", 403, "FORBIDDEN"));
    }

    next();
};
