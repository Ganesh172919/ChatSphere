import type { NextFunction, Request, Response } from "express";
import { AppError } from "../helpers/app-error";

export const notFoundMiddleware = (request: Request, _response: Response, next: NextFunction) => {
  next(new AppError(404, "NOT_FOUND", `Route ${request.method} ${request.originalUrl} not found`));
};
