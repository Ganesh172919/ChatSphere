import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { getSettings, updateSettings } from "../services/settings.service";

const router = Router();

const settingsSchema = z.object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    accentColor: z.string().min(1).max(30).optional(),
    notifications: z
        .object({
            email: z.boolean().optional(),
            push: z.boolean().optional(),
            mentions: z.boolean().optional(),
        })
        .optional(),
    aiFeatures: z
        .object({
            smartReplies: z.boolean().optional(),
            sentiment: z.boolean().optional(),
            grammar: z.boolean().optional(),
        })
        .optional(),
});

router.use(protect);

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const settings = await getSettings(req.user!.userId);
        res.status(200).json({ success: true, data: settings });
    })
);

router.put(
    "/",
    validateBody(settingsSchema),
    asyncHandler(async (req, res) => {
        const settings = await updateSettings(req.user!.userId, req.body);
        res.status(200).json({ success: true, data: settings, message: "Settings updated" });
    })
);

export default router;
