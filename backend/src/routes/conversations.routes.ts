import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware";
import {
    deleteConversation,
    getConversationById,
    getConversationInsight,
    listConversations,
    runConversationAction,
} from "../services/conversation.service";

const router = Router();

const idParamsSchema = z.object({
    conversationId: z.string().uuid(),
});

const actionBodySchema = z.object({
    action: z.enum(["summarize", "extract-tasks", "extract-decisions"]),
});

const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

router.use(protect);

router.get(
    "/",
    validateQuery(listQuerySchema),
    asyncHandler(async (req, res) => {
        const conversations = await listConversations(req.user!.userId);
        res.status(200).json({ success: true, data: conversations });
    })
);

router.get(
    "/:conversationId",
    validateParams(idParamsSchema),
    asyncHandler(async (req, res) => {
        const conversationId = String(req.params.conversationId);
        const conversation = await getConversationById(req.user!.userId, conversationId);
        res.status(200).json({ success: true, data: conversation });
    })
);

router.get(
    "/:conversationId/insights",
    validateParams(idParamsSchema),
    asyncHandler(async (req, res) => {
        const conversationId = String(req.params.conversationId);
        const insight = await getConversationInsight(req.user!.userId, conversationId);
        res.status(200).json({ success: true, data: insight });
    })
);

router.post(
    "/:conversationId/actions",
    validateParams(idParamsSchema),
    validateBody(actionBodySchema),
    asyncHandler(async (req, res) => {
        const conversationId = String(req.params.conversationId);
        const result = await runConversationAction(
            req.user!.userId,
            conversationId,
            req.body.action
        );

        res.status(200).json({ success: true, data: result });
    })
);

router.delete(
    "/:conversationId",
    validateParams(idParamsSchema),
    asyncHandler(async (req, res) => {
        const conversationId = String(req.params.conversationId);
        const result = await deleteConversation(req.user!.userId, conversationId);
        res.status(200).json({ success: true, data: result });
    })
);

export default router;
