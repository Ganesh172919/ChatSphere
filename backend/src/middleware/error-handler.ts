import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { AppError } from "../helpers/app-error";

export const errorHandler = (
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
) => {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: error.flatten()
      }
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const statusCode = error.code === 'P2002' ? 409 : 500;
    const message = error.code === 'P2002' 
      ? 'A conflict occurred with existing data'
      : 'A database error occurred';
    return response.status(statusCode).json({
      success: false,
      error: {
        code: error.code,
        message
      }
    });
  }

  // Log the actual error details for debugging
  if (error instanceof Error) {
    console.error("ERROR DETAILS:", error.message);
    console.error("ERROR STACK:", error.stack);
  } else {
    console.error("UNKNOWN ERROR:", error);
  }
  
  logger.error({ err: error, path: request.originalUrl, method: request.method }, "Unhandled application error");
  
  return response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "An unexpected error occurred"
    }
  });
};
