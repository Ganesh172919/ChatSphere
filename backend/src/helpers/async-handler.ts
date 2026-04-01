import type { NextFunction, Request, Response } from "express";

export const asyncHandler =
  (
    handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>
  ) =>
  (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
