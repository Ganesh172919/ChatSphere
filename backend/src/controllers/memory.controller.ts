import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as memoryService from "../services/memory.service";

const unauthorized = (res: Response) =>
    res.status(401).json({
        success: false,
        message: "Unauthorized",
    });

export const getGraph = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const data = await memoryService.getMemoryGraph(req.user.userId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const createNode = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const data = await memoryService.createMemoryNode(req.user.userId, req.body);
        return res.status(201).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const updateNode = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const nodeId = String(req.params.nodeId);
        const data = await memoryService.updateMemoryNode(req.user.userId, nodeId, req.body);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteNode = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const nodeId = String(req.params.nodeId);
        const data = await memoryService.deleteMemoryNode(req.user.userId, nodeId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const createEdge = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const data = await memoryService.createMemoryEdge(req.user.userId, req.body);
        return res.status(201).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteEdge = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.userId) {
            return unauthorized(res);
        }

        const edgeId = String(req.params.edgeId);
        const data = await memoryService.deleteMemoryEdge(req.user.userId, edgeId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
