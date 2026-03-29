import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { importUserData, previewImport } from "../services/importExport.service";

const router = Router();

router.use(protect);

router.post(
    "/preview",
    validateBody(
        z.object({
            raw: z.string().min(1),
            sourceType: z.string().max(50).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const result = await previewImport(req.body);
        res.status(200).json({ success: true, data: result });
    })
);

router.post(
    "/",
    validateBody(
        z.object({
            raw: z.string().min(1),
            sourceType: z.string().max(50).optional(),
            mode: z.enum(["preview", "import"]),
        })
    ),
    asyncHandler(async (req, res) => {
        const result = await importUserData({
            userId: req.user!.userId,
            raw: req.body.raw,
            sourceType: req.body.sourceType,
            mode: req.body.mode,
        });

        res.status(200).json({ success: true, data: result });
    })
);

export default router;
