import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateParams, validateQuery } from "../middleware/validate.middleware";
import {
    exportConversation,
    exportRoomMessages,
    exportUserBundle,
} from "../services/importExport.service";

const router = Router();

router.use(protect);

router.get(
    "/bundle",
    validateQuery(
        z.object({
            format: z.enum(["normalized", "markdown", "adapter"]).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const format = (req.query.format ?? "normalized") as
            | "normalized"
            | "markdown"
            | "adapter";
        const data = await exportUserBundle(req.user!.userId, format);
        res.status(200).json({ success: true, data });
    })
);

router.get(
    "/room/:roomId",
    validateParams(z.object({ roomId: z.string().uuid() })),
    validateQuery(z.object({ format: z.enum(["json", "markdown"]).optional() })),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const format = (req.query.format ?? "json") as "json" | "markdown";
        const data = await exportRoomMessages(
            req.user!.userId,
            roomId,
            format
        );

        res.status(200).json({ success: true, data });
    })
);

router.get(
    "/conversation/:conversationId",
    validateParams(z.object({ conversationId: z.string().uuid() })),
    validateQuery(z.object({ format: z.enum(["json", "markdown"]).optional() })),
    asyncHandler(async (req, res) => {
        const conversationId = String(req.params.conversationId);
        const format = (req.query.format ?? "json") as "json" | "markdown";
        const data = await exportConversation(
            req.user!.userId,
            conversationId,
            format
        );

        res.status(200).json({ success: true, data });
    })
);

export default router;
