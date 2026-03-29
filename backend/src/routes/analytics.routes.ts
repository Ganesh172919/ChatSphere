import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { adminCheck } from "../middleware/admin.middleware";
import { validateQuery } from "../middleware/validate.middleware";
import {
    getDailyActiveUsers,
    getDailyMessageCounts,
    getTopRoomsByActivity,
} from "../services/analytics.service";

const router = Router();

router.use(protect, adminCheck);

router.get(
    "/messages",
    validateQuery(z.object({ days: z.coerce.number().int().min(1).max(90).optional() })),
    asyncHandler(async (req, res) => {
        const days = req.query.days ? Number(req.query.days) : 30;
        const result = await getDailyMessageCounts(days);
        res.status(200).json({ success: true, data: result });
    })
);

router.get(
    "/users",
    validateQuery(z.object({ days: z.coerce.number().int().min(1).max(90).optional() })),
    asyncHandler(async (req, res) => {
        const days = req.query.days ? Number(req.query.days) : 30;
        const result = await getDailyActiveUsers(days);
        res.status(200).json({ success: true, data: result });
    })
);

router.get(
    "/rooms",
    asyncHandler(async (_req, res) => {
        const result = await getTopRoomsByActivity();
        res.status(200).json({ success: true, data: result });
    })
);

export default router;
