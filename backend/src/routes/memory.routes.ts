import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { AppError } from "../helpers/errors";
import { protect } from "../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware";
import {
    deleteMemoryEntry,
    exportMemoryEntries,
    listMemoryEntries,
    previewMemoryImport,
    updateMemoryEntry,
    upsertMemoryCandidates,
} from "../services/memory.service";

const router = Router();

router.use(protect);

router.get(
    "/",
    validateQuery(
        z.object({
            search: z.string().optional(),
            pinned: z.coerce.boolean().optional(),
            limit: z.coerce.number().int().min(1).max(100).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const result = await listMemoryEntries(req.user!.userId, req.query);
        res.status(200).json({ success: true, data: result });
    })
);

router.put(
    "/:memoryId",
    validateParams(z.object({ memoryId: z.string().uuid() })),
    validateBody(
        z.object({
            summary: z.string().min(1).max(500).optional(),
            details: z.string().max(5000).optional(),
            tags: z.array(z.string().min(1).max(64)).max(50).optional(),
            pinned: z.boolean().optional(),
            confidence: z.number().min(0).max(1).optional(),
            importance: z.number().min(0).max(1).optional(),
            recency: z.number().min(0).max(1).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const memoryId = String(req.params.memoryId);
        const updated = await updateMemoryEntry(req.user!.userId, memoryId, req.body);

        if (!updated) {
            throw new AppError("Memory entry not found", 404, "NOT_FOUND");
        }

        res.status(200).json({ success: true, data: updated, message: "Memory updated" });
    })
);

router.delete(
    "/:memoryId",
    validateParams(z.object({ memoryId: z.string().uuid() })),
    asyncHandler(async (req, res) => {
        const memoryId = String(req.params.memoryId);
        const deleted = await deleteMemoryEntry(req.user!.userId, memoryId);

        if (!deleted) {
            throw new AppError("Memory entry not found", 404, "NOT_FOUND");
        }

        res.status(200).json({ success: true, data: { deleted: true }, message: "Memory deleted" });
    })
);

router.post(
    "/import",
    validateBody(
        z.object({
            mode: z.enum(["preview", "import"]),
            entries: z
                .array(
                    z.object({
                        summary: z.string().min(1).max(500),
                        details: z.string().max(5000).optional(),
                        tags: z.array(z.string().min(1).max(64)).max(50).optional(),
                        confidence: z.number().min(0).max(1).optional(),
                        importance: z.number().min(0).max(1).optional(),
                    })
                )
                .min(1)
                .max(200),
        })
    ),
    asyncHandler(async (req, res) => {
        const candidates = req.body.entries.map((entry: { summary: string; details?: string; tags?: string[]; confidence?: number; importance?: number; }) => ({
            ...entry,
            tags: entry.tags ?? [],
        }));

        if (req.body.mode === "preview") {
            const preview = await previewMemoryImport(req.user!.userId, candidates);
            res.status(200).json({ success: true, data: preview });
            return;
        }

        const imported = await upsertMemoryCandidates(req.user!.userId, candidates);
        res.status(200).json({
            success: true,
            data: {
                importedCount: imported.length,
            },
            message: "Memory import completed",
        });
    })
);

router.get(
    "/export",
    validateQuery(z.object({ format: z.enum(["json", "markdown", "adapter"]).optional() })),
    asyncHandler(async (req, res) => {
        const format = (req.query.format ?? "json") as "json" | "markdown" | "adapter";
        const data = await exportMemoryEntries(req.user!.userId, format);
        res.status(200).json({ success: true, data });
    })
);

export default router;
