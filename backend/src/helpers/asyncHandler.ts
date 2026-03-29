import { NextFunction, Request, Response } from "express";

export const asyncHandler = <TRequest extends Request = Request>(
    handler: (
        req: TRequest,
        res: Response,
        next: NextFunction
    ) => Promise<unknown>
) => {
    return (req: TRequest, res: Response, next: NextFunction): void => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
};
