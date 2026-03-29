import { prisma } from "../lib/prisma";

const clamp01 = (value: number | undefined, fallback: number) => {
    if (!Number.isFinite(value as number)) {
        return fallback;
    }

    return Math.max(0, Math.min(1, Number(value)));
};

const normalizeColor = (value?: string) => {
    if (!value) {
        return undefined;
    }

    const color = value.trim();
    if (!/^#([0-9a-fA-F]{6})$/.test(color)) {
        throw new Error("Color must be a hex value like #22c55e");
    }

    return color;
};

export const getMemoryGraph = async (userId: string) => {
    const [nodes, edges] = await Promise.all([
        prisma.memoryNode.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
        }),
        prisma.memoryEdge.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    return { nodes, edges };
};

export const createMemoryNode = async (
    userId: string,
    payload: {
        label: string;
        description?: string;
        strength?: number;
        color?: string;
    }
) => {
    if (!payload.label?.trim()) {
        throw new Error("Node label is required");
    }

    return prisma.memoryNode.create({
        data: {
            userId,
            label: payload.label.trim(),
            description: payload.description?.trim(),
            strength: clamp01(payload.strength, 0.5),
            color: normalizeColor(payload.color),
        },
    });
};

export const updateMemoryNode = async (
    userId: string,
    nodeId: string,
    payload: {
        label?: string;
        description?: string;
        strength?: number;
        color?: string;
    }
) => {
    const existing = await prisma.memoryNode.findUnique({ where: { id: nodeId } });
    if (!existing || existing.userId !== userId) {
        throw new Error("Memory node not found");
    }

    return prisma.memoryNode.update({
        where: { id: nodeId },
        data: {
            label: payload.label?.trim(),
            description: payload.description?.trim(),
            strength: typeof payload.strength === "number" ? clamp01(payload.strength, existing.strength) : undefined,
            color: payload.color ? normalizeColor(payload.color) : undefined,
        },
    });
};

export const deleteMemoryNode = async (userId: string, nodeId: string) => {
    const existing = await prisma.memoryNode.findUnique({ where: { id: nodeId } });
    if (!existing || existing.userId !== userId) {
        throw new Error("Memory node not found");
    }

    await prisma.memoryEdge.deleteMany({
        where: {
            userId,
            OR: [{ fromNodeId: nodeId }, { toNodeId: nodeId }],
        },
    });

    await prisma.memoryNode.delete({ where: { id: nodeId } });
    return { success: true };
};

export const createMemoryEdge = async (
    userId: string,
    payload: {
        fromNodeId: string;
        toNodeId: string;
        label?: string;
        weight?: number;
    }
) => {
    if (payload.fromNodeId === payload.toNodeId) {
        throw new Error("Self-link edges are not allowed");
    }

    const nodes = await prisma.memoryNode.findMany({
        where: {
            userId,
            id: {
                in: [payload.fromNodeId, payload.toNodeId],
            },
        },
        select: { id: true },
    });

    if (nodes.length !== 2) {
        throw new Error("Both nodes must exist");
    }

    return prisma.memoryEdge.create({
        data: {
            userId,
            fromNodeId: payload.fromNodeId,
            toNodeId: payload.toNodeId,
            label: payload.label?.trim(),
            weight: clamp01(payload.weight, 0.5),
        },
    });
};

export const deleteMemoryEdge = async (userId: string, edgeId: string) => {
    const edge = await prisma.memoryEdge.findUnique({ where: { id: edgeId } });
    if (!edge || edge.userId !== userId) {
        throw new Error("Memory edge not found");
    }

    await prisma.memoryEdge.delete({ where: { id: edgeId } });
    return { success: true };
};
