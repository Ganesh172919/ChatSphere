import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "./app-error";

export const validateBody =
  <T extends ZodType>(schema: T) =>
  (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return next(new AppError(400, "VALIDATION_ERROR", "Request body validation failed", parsed.error.flatten()));
    }

    request.body = parsed.data;
    return next();
  };

export const validateQuery =
  <T extends ZodType>(schema: T) =>
  (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) {
      return next(new AppError(400, "VALIDATION_ERROR", "Query validation failed", parsed.error.flatten()));
    }

    // Express 5: request.query is read-only, merge instead of replace
    Object.assign(request.query, parsed.data);
    return next();
  };
