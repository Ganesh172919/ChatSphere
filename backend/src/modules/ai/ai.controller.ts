import type { Request, Response } from "express";
import { ok } from "../../helpers/api-response";
import { aiService } from "./ai.service";

export const aiController = {
  async chat(request: Request, response: Response) {
    const result = await aiService.chat(request.user!.sub, request.body);
    response.json(ok(result));
  },

  async smartReplies(request: Request, response: Response) {
    const smartReplies = await aiService.smartReplies(request.user!.sub, request.body.prompt, request.body.roomId);
    response.json(ok({ smartReplies }));
  },

  async insights(request: Request, response: Response) {
    const result = await aiService.insights(request.user!.sub, request.body.text, request.body.roomId);
    response.json(ok(result));
  }
};
