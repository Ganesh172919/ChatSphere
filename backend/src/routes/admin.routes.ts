import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { adminCheck } from "../middleware/admin.middleware";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware";
import {
    getAdminStats,
    listAdminPromptTemplates,
    listReports,
    listUsers,
    reviewReport,
    upsertAdminPromptTemplate,
} from "../services/admin.service";

const router = Router();

router.use(protect, adminCheck);

router.get(
    "/stats",
    asyncHandler(async (_req, res) => {
        const stats = await getAdminStats();
        res.status(200).json({ success: true, data: stats });
    })
);

router.get(
    "/reports",
    validateQuery(
        z.object({
            status: z.string().optional(),
            targetType: z.string().optional(),
            page: z.coerce.number().int().min(1).optional(),
            pageSize: z.coerce.number().int().min(1).max(100).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const result = await listReports(req.query);
        res.status(200).json({ success: true, data: result });
    })
);

router.patch(
    "/reports/:id",
    validateParams(z.object({ id: z.string().uuid() })),
    validateBody(
        z.object({
            status: z.enum(["REVIEWED", "RESOLVED", "REJECTED"]),
            resolutionNote: z.string().max(2000).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const reportId = String(req.params.id);
        const report = await reviewReport(req.user!.userId, reportId, req.body);
        res.status(200).json({ success: true, data: report, message: "Report updated" });
    })
);

router.get(
    "/users",
    validateQuery(
        z.object({
            query: z.string().optional(),
            page: z.coerce.number().int().min(1).optional(),
            pageSize: z.coerce.number().int().min(1).max(100).optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const users = await listUsers(req.query);
        res.status(200).json({ success: true, data: users });
    })
);

router.get(
    "/prompt-templates",
    asyncHandler(async (_req, res) => {
        const templates = await listAdminPromptTemplates();
        res.status(200).json({ success: true, data: templates });
    })
);

router.put(
    "/prompt-templates",
    validateBody(
        z.object({
            key: z.string().min(1).max(120),
            version: z.number().int().min(1).optional(),
            description: z.string().max(1000).optional(),
            content: z.string().min(1).max(50000),
            isActive: z.boolean().optional(),
        })
    ),
    asyncHandler(async (req, res) => {
        const template = await upsertAdminPromptTemplate(req.body);
        res.status(200).json({ success: true, data: template, message: "Template upserted" });
    })
);

export default router;
