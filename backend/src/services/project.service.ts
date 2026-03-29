import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";
import { normalizeTags } from "../helpers/validation";

const toJson = (value: unknown): Prisma.InputJsonValue => {
    return value as Prisma.InputJsonValue;
};

interface ProjectPayload {
    name?: string;
    description?: string;
    instructions?: string;
    context?: string;
    tags?: string[];
    suggestedPrompts?: string[];
    files?: Array<{
        fileUrl: string;
        fileName: string;
        fileType?: string;
        fileSize?: number;
        note?: string;
        addedAt?: string;
    }>;
}

const normalizeFiles = (files: ProjectPayload["files"]) => {
    if (!Array.isArray(files)) {
        return [];
    }

    return files
        .filter((file) => file && typeof file.fileUrl === "string" && typeof file.fileName === "string")
        .map((file) => ({
            fileUrl: file.fileUrl,
            fileName: file.fileName,
            fileType: file.fileType ?? "unknown",
            fileSize: Number(file.fileSize ?? 0),
            note: file.note ?? "",
            addedAt: file.addedAt ?? new Date().toISOString(),
        }));
};

export const listProjects = async (userId: string) => {
    const projects = await prisma.project.findMany({
        where: {
            userId,
        },
        include: {
            _count: {
                select: {
                    conversations: true,
                },
            },
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    return projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        tags: project.tags,
        suggestedPrompts: project.suggestedPrompts,
        conversationCount: project._count.conversations,
        updatedAt: project.updatedAt,
        createdAt: project.createdAt,
    }));
};

export const getProjectById = async (userId: string, projectId: string) => {
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            userId,
        },
        include: {
            conversations: {
                select: {
                    id: true,
                    title: true,
                    updatedAt: true,
                },
                orderBy: {
                    updatedAt: "desc",
                },
                take: 10,
            },
        },
    });

    if (!project) {
        throw new AppError("Project not found", 404, "NOT_FOUND");
    }

    return project;
};

export const createProject = async (userId: string, payload: ProjectPayload) => {
    const name = String(payload.name ?? "").trim();

    if (name.length < 2 || name.length > 120) {
        throw new AppError("Project name must be between 2 and 120 characters", 400, "VALIDATION_ERROR");
    }

    const tags = normalizeTags(payload.tags);
    const suggestedPrompts = Array.isArray(payload.suggestedPrompts)
        ? payload.suggestedPrompts.map((item) => String(item).trim()).filter(Boolean)
        : [];
    const files = normalizeFiles(payload.files);

    return prisma.project.create({
        data: {
            userId,
            name,
            description: payload.description?.trim(),
            instructions: payload.instructions?.trim(),
            context: payload.context?.trim(),
            tags: toJson(tags),
            suggestedPrompts: toJson(suggestedPrompts),
            files: toJson(files),
        },
    });
};

export const updateProject = async (
    userId: string,
    projectId: string,
    payload: ProjectPayload
) => {
    const existing = await prisma.project.findFirst({
        where: {
            id: projectId,
            userId,
        },
    });

    if (!existing) {
        throw new AppError("Project not found", 404, "NOT_FOUND");
    }

    const data: Prisma.ProjectUpdateInput = {};

    if (typeof payload.name === "string") {
        const name = payload.name.trim();

        if (name.length < 2 || name.length > 120) {
            throw new AppError("Project name must be between 2 and 120 characters", 400, "VALIDATION_ERROR");
        }

        data.name = name;
    }

    if (typeof payload.description === "string") {
        data.description = payload.description.trim();
    }

    if (typeof payload.instructions === "string") {
        data.instructions = payload.instructions.trim();
    }

    if (typeof payload.context === "string") {
        data.context = payload.context.trim();
    }

    if (Array.isArray(payload.tags)) {
        data.tags = toJson(normalizeTags(payload.tags));
    }

    if (Array.isArray(payload.suggestedPrompts)) {
        data.suggestedPrompts = toJson(
            payload.suggestedPrompts.map((item) => String(item).trim()).filter(Boolean)
        );
    }

    if (Array.isArray(payload.files)) {
        data.files = toJson(normalizeFiles(payload.files));
    }

    return prisma.project.update({
        where: {
            id: projectId,
        },
        data,
    });
};

export const deleteProject = async (userId: string, projectId: string) => {
    const existing = await prisma.project.findFirst({
        where: {
            id: projectId,
            userId,
        },
    });

    if (!existing) {
        throw new AppError("Project not found", 404, "NOT_FOUND");
    }

    await prisma.$transaction([
        prisma.conversation.updateMany({
            where: {
                userId,
                projectId,
            },
            data: {
                projectId: null,
            },
        }),
        prisma.project.delete({
            where: {
                id: projectId,
            },
        }),
    ]);

    return {
        success: true,
    };
};
