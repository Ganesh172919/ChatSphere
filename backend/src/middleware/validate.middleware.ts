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

const setRequestValue = <K extends "body" | "params" | "query">(
    req: Request,
    key: K,
    value: Request[K]
) => {
    Object.defineProperty(req, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value,
    });
};

export const validateBody = <T>(schema: ZodSchema<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        setRequestValue(req, "body", parseWithSchema(schema, req.body) as Request["body"]);
        next();
    };
};

export const validateParams = <T>(schema: ZodSchema<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        setRequestValue(req, "params", parseWithSchema(schema, req.params) as Request["params"]);
        next();
    };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        setRequestValue(req, "query", parseWithSchema(schema, req.query) as Request["query"]);
        next();
    };
};
