import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateQuery } from "../middleware/validate.middleware";
import { searchConversations, searchMessages } from "../services/search.service";

const router = Router();

router.use(protect);

router.get(
    "/messages",
    validateQuery(
        z.object({
            q: z.string().min(1),
            roomId: z.string().uuid().optional(),
            userId: z.string().uuid().optional(),
            startDate: z.string().datetime().optional(),
            endDate: z.string().datetime().optional(),
            isAI: z.coerce.boolean().optional(),
            pinned: z.coerce.boolean().optional(),
            hasFiles: z.coerce.boolean().optional(),
            limit: z.coerce.number().int().min(1).max(100).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const query = req.query as unknown as {
            q: string;
            roomId?: string;
            userId?: string;
            startDate?: string;
            endDate?: string;
            isAI?: boolean;
            pinned?: boolean;
            hasFiles?: boolean;
            limit?: number;
        };

        const results = await searchMessages(req.user!.userId, query);
        res.status(200).json({ success: true, data: results });
    })
);

router.get(
    "/conversations",
    validateQuery(
        z.object({
            q: z.string().min(1),
            limit: z.coerce.number().int().min(1).max(100).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const query = req.query as unknown as {
            q: string;
            limit?: number;
        };

        const results = await searchConversations(
            req.user!.userId,
            query.q,
            query.limit
        );
        res.status(200).json({ success: true, data: results });
    })
);

export default router;
