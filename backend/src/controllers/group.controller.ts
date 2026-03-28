import { Request, Response } from "express";
import * as groupService from "../services/group.service";
import { AuthRequest } from "../middleware/auth.middleware";

// CREATE GROUP CHAT
export const createGroup = async (req: AuthRequest, res: Response) => {
    try {
        const { name, members } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!name || typeof name !== "string") {
            return res.status(400).json({
                success: false,
                message: "Group name is required",
            });
        }

        const group = await groupService.createGroupChat({
            name,
            createdById: userId,
            members: members || [],
        });

        res.status(201).json({
            success: true,
            data: group,
            message: "Group chat created successfully",
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// GET GROUP DETAILS
export const getGroup = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const group = await groupService.getGroupChat(groupId, userId);

        res.status(200).json({
            success: true,
            data: group,
        });
    } catch (error: any) {
        if (error.message === "Unauthorized: Not a member of this chat") {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// GET ALL CHATS FOR USER
export const getUserChats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const chats = await groupService.getUserChats(userId);

        res.status(200).json({
            success: true,
            data: chats,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// ADD MEMBER TO GROUP
export const addMember = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const { userId: userIdToAdd } = req.body;
        const performedBy = req.user?.userId;

        if (!performedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!userIdToAdd) {
            return res.status(400).json({
                success: false,
                message: "User ID to add is required",
            });
        }

        const result = await groupService.addMemberToGroup(
            groupId,
            userIdToAdd,
            performedBy
        );

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: any) {
        if (error.message.includes("Only group admins")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// REMOVE MEMBER FROM GROUP
export const removeMember = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const { userId: userIdToRemove } = req.body;
        const performedBy = req.user?.userId;

        if (!performedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!userIdToRemove) {
            return res.status(400).json({
                success: false,
                message: "User ID to remove is required",
            });
        }

        const result = await groupService.removeMemberFromGroup(
            groupId,
            userIdToRemove,
            performedBy
        );

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: any) {
        if (error.message.includes("Only group admins")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// UPDATE GROUP NAME
export const updateGroup = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const { name } = req.body;
        const performedBy = req.user?.userId;

        if (!performedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Group name is required",
            });
        }

        const result = await groupService.updateGroupName(
            groupId,
            name,
            performedBy
        );

        res.status(200).json({
            success: true,
            data: result,
            message: "Group name updated successfully",
        });
    } catch (error: any) {
        if (error.message.includes("Only group admins")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// CHANGE MEMBER ROLE
export const changeMemberRole = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const { userId: userIdToChangeRole, role } = req.body;
        const performedBy = req.user?.userId;

        if (!performedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!userIdToChangeRole || !role) {
            return res.status(400).json({
                success: false,
                message: "User ID and role are required",
            });
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be ADMIN or MEMBER",
            });
        }

        const result = await groupService.changeMemberRole(
            groupId,
            userIdToChangeRole,
            role,
            performedBy
        );

        res.status(200).json({
            success: true,
            data: result,
            message: "Member role updated successfully",
        });
    } catch (error: any) {
        if (error.message.includes("Only group admins")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

// DELETE GROUP CHAT
export const deleteGroup = async (req: AuthRequest, res: Response) => {
    try {
        const { groupId } = req.params;
        const performedBy = req.user?.userId;

        if (!performedBy) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const result = await groupService.deleteGroupChat(groupId, performedBy);

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: any) {
        if (error.message.includes("Only group admins")) {
            return res.status(403).json({
                success: false,
                message: error.message,
            });
        }

        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};