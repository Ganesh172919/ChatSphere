import type { Request, Response } from "express";
import { ok } from "../../helpers/api-response";
import { memoryService } from "./memory.service";

export const memoryController = {
  async list(request: Request, response: Response) {
    const query = request.query as { query?: string; roomId?: string; limit?: number };
    const entries = await memoryService.list(request.user!.sub, query.query, query.roomId, query.limit);
    response.json(ok({ entries }));
  },

  async create(request: Request, response: Response) {
    const entry = await memoryService.create(request.user!.sub, request.body);
    response.status(201).json(ok({ entry }));
  },

  async extract(request: Request, response: Response) {
    const entry = await memoryService.extractFromContent(request.user!.sub, request.body.content, request.body.roomId);
    response.status(201).json(ok({ entry }));
  }
};
