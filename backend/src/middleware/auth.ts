import type { NextFunction, Request, Response } from "express";
import { AppError } from "../helpers/app-error";
import { tokenService } from "../services/auth/token.service";

const parseBearerToken = (request: Request) => {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
};

export const requireAuth = (request: Request, _response: Response, next: NextFunction) => {
  try {
    const token = parseBearerToken(request);
    if (!token) {
      throw new AppError(401, "AUTH_REQUIRED", "A bearer access token is required");
    }

    request.user = tokenService.verifyAccessToken(token);
    return next();
  } catch {
    return next(new AppError(401, "INVALID_ACCESS_TOKEN", "The access token is invalid or expired"));
  }
};

export const optionalAuth = (request: Request, _response: Response, next: NextFunction) => {
  try {
    const token = parseBearerToken(request);
    request.user = token ? tokenService.verifyAccessToken(token) : undefined;
  } catch {
    request.user = undefined;
  }
  next();
};
