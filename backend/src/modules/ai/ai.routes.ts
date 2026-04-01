import { Router } from "express";
import { asyncHandler } from "../../helpers/async-handler";
import { validateBody } from "../../helpers/validation";
import { requireAuth } from "../../middleware/auth";
import { aiController } from "./ai.controller";
import { aiChatSchema, aiInsightSchema } from "./ai.schemas";

export const aiRouter = Router();

aiRouter.use(requireAuth);
aiRouter.post("/chat", validateBody(aiChatSchema), asyncHandler(aiController.chat));
aiRouter.post("/smart-replies", validateBody(aiChatSchema.pick({ prompt: true, roomId: true })), asyncHandler(aiController.smartReplies));
aiRouter.post("/insights", validateBody(aiInsightSchema), asyncHandler(aiController.insights));
