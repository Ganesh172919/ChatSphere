import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody, validateParams } from "../middleware/validate.middleware";
import {
    createProject,
    deleteProject,
    getProjectById,
    listProjects,
    updateProject,
} from "../services/project.service";

const router = Router();

const projectPayloadSchema = z.object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(5000).optional(),
    instructions: z.string().max(12000).optional(),
    context: z.string().max(20000).optional(),
    tags: z.array(z.string().min(1).max(64)).max(50).optional(),
    suggestedPrompts: z.array(z.string().min(1).max(500)).max(50).optional(),
    files: z
        .array(
            z.object({
                fileUrl: z.string().url(),
                fileName: z.string().min(1).max(255),
                fileType: z.string().max(120).optional(),
                fileSize: z.number().int().min(0).optional(),
                note: z.string().max(1000).optional(),
                addedAt: z.string().datetime().optional(),
            })
        )
        .max(200)
        .optional(),
});

router.use(protect);

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const projects = await listProjects(req.user!.userId);
        res.status(200).json({ success: true, data: projects });
    })
);

router.post(
    "/",
    validateBody(projectPayloadSchema.extend({ name: z.string().min(2).max(120) })),
    asyncHandler(async (req, res) => {
        const project = await createProject(req.user!.userId, req.body);
        res.status(201).json({ success: true, data: project, message: "Project created" });
    })
);

router.get(
    "/:projectId",
    validateParams(z.object({ projectId: z.string().uuid() })),
    asyncHandler(async (req, res) => {
        const projectId = String(req.params.projectId);
        const project = await getProjectById(req.user!.userId, projectId);
        res.status(200).json({ success: true, data: project });
    })
);

router.patch(
    "/:projectId",
    validateParams(z.object({ projectId: z.string().uuid() })),
    validateBody(projectPayloadSchema),
    asyncHandler(async (req, res) => {
        const projectId = String(req.params.projectId);
        const project = await updateProject(req.user!.userId, projectId, req.body);
        res.status(200).json({ success: true, data: project, message: "Project updated" });
    })
);

router.delete(
    "/:projectId",
    validateParams(z.object({ projectId: z.string().uuid() })),
    asyncHandler(async (req, res) => {
        const projectId = String(req.params.projectId);
        const result = await deleteProject(req.user!.userId, projectId);
        res.status(200).json({ success: true, data: result, message: "Project deleted" });
    })
);

export default router;
