import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { aiQuota } from "../middleware/aiQuota.middleware";
import { aiLimiter } from "../middleware/rateLimit.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { handleSoloChat } from "../services/chat.service";

const router = Router();

const chatBodySchema = z.object({
    message: z.string().min(1).max(6000),
    conversationId: z.string().uuid().optional(),
    modelId: z.string().min(1).max(120).optional(),
    projectId: z.string().uuid().optional(),
    attachment: z
        .object({
            fileUrl: z.string().url().optional(),
            fileName: z.string().max(255).optional(),
            fileType: z.string().max(120).optional(),
            fileSize: z.number().int().min(0).max(5 * 1024 * 1024).optional(),
            textContent: z.string().max(20000).optional(),
            base64: z.string().max(1_500_000).optional(),
        })
        .optional(),
});

router.post(
    "/",
    protect,
    aiLimiter,
    aiQuota,
    validateBody(chatBodySchema),
    asyncHandler(async (req, res) => {
        const result = await handleSoloChat({
            userId: req.user!.userId,
            message: req.body.message,
            conversationId: req.body.conversationId,
            modelId: req.body.modelId,
            projectId: req.body.projectId,
            attachment: req.body.attachment,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    })
);

export default router;
