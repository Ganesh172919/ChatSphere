import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody, validateParams } from "../middleware/validate.middleware";
import { getPublicUserProfile, updateUserProfile } from "../services/user.service";

const router = Router();

router.put(
    "/profile",
    protect,
    validateBody(
        z.object({
            displayName: z.string().min(2).max(60).optional(),
            bio: z.string().max(500).optional(),
            avatar: z.string().url().max(1000).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const profile = await updateUserProfile(req.user!.userId, req.body);
        res.status(200).json({ success: true, data: profile, message: "Profile updated" });
    })
);

router.get(
    "/:id",
    validateParams(z.object({ id: z.string().uuid() })),
    asyncHandler(async (req, res) => {
        const userId = String(req.params.id);
        const profile = await getPublicUserProfile(userId);
        res.status(200).json({ success: true, data: profile });
    })
);

export default router;
