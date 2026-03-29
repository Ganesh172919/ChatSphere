import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody, validateParams } from "../middleware/validate.middleware";
import {
    blockUser,
    createReport,
    listBlockedUsers,
    unblockUser,
} from "../services/moderation.service";

const router = Router();

router.use(protect);

router.post(
    "/report",
    validateBody(
        z.object({
            targetType: z.enum(["user", "message"]),
            targetId: z.string().uuid(),
            roomId: z.string().uuid().optional(),
            reason: z.string().min(3).max(200),
            description: z.string().max(2000).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const report = await createReport({
            reporterId: req.user!.userId,
            targetType: req.body.targetType,
            targetId: req.body.targetId,
            roomId: req.body.roomId,
            reason: req.body.reason,
            description: req.body.description,
        });

        res.status(201).json({ success: true, data: report, message: "Report submitted" });
    })
);

router.post(
    "/block",
    validateBody(
        z.object({
            userId: z.string().uuid(),
        })
    ),
    asyncHandler(async (req, res) => {
        const result = await blockUser(req.user!.userId, req.body.userId);
        res.status(200).json({ success: true, data: result, message: "User blocked" });
    })
);

router.delete(
    "/block/:userId",
    validateParams(z.object({ userId: z.string().uuid() })),
    asyncHandler(async (req, res) => {
        const targetUserId = String(req.params.userId);
        const result = await unblockUser(req.user!.userId, targetUserId);
        res.status(200).json({ success: true, data: result, message: "User unblocked" });
    })
);

router.get(
    "/blocked",
    asyncHandler(async (req, res) => {
        const users = await listBlockedUsers(req.user!.userId);
        res.status(200).json({ success: true, data: users });
    })
);

export default router;
