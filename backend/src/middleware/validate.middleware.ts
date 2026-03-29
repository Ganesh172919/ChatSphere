import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../helpers/errors";

const parseWithSchema = <T>(schema: ZodSchema<T>, payload: unknown): T => {
    const result = schema.safeParse(payload);

    if (!result.success) {
        throw new AppError("Validation failed", 400, "VALIDATION_ERROR", result.error.issues);
    }

    return result.data;
};

export const validateBody = <T>(schema: ZodSchema<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        req.body = parseWithSchema(schema, req.body);
        next();
    };
};

export const validateParams = <T>(schema: ZodSchema<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        req.params = parseWithSchema(schema, req.params) as Request["params"];
        next();
    };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        req.query = parseWithSchema(schema, req.query) as Request["query"];
        next();
    };
};
