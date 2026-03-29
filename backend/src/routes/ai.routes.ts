import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { aiQuota } from "../middleware/aiQuota.middleware";
import { aiLimiter } from "../middleware/rateLimit.middleware";
import { validateBody } from "../middleware/validate.middleware";
import {
    analyzeSentiment,
    generateSmartReplies,
    improveGrammar,
    listAiModels,
} from "../services/aiFeature.service";

const router = Router();

router.use(protect, aiLimiter, aiQuota);

router.get(
    "/models",
    asyncHandler(async (_req, res) => {
        const models = await listAiModels();
        res.status(200).json({ success: true, data: models });
    })
);

router.post(
    "/smart-replies",
    validateBody(
        z.object({
            message: z.string().min(1).max(4000),
            modelId: z.string().min(1).max(120).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const data = await generateSmartReplies(req.user!.userId, req.body);
        res.status(200).json({ success: true, data });
    })
);

router.post(
    "/sentiment",
    validateBody(
        z.object({
            message: z.string().min(1).max(4000),
            modelId: z.string().min(1).max(120).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const data = await analyzeSentiment(req.user!.userId, req.body);
        res.status(200).json({ success: true, data });
    })
);

router.post(
    "/grammar",
    validateBody(
        z.object({
            message: z.string().min(1).max(4000),
            modelId: z.string().min(1).max(120).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const data = await improveGrammar(req.user!.userId, req.body);
        res.status(200).json({ success: true, data });
    })
);

export default router;
