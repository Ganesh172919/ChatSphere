import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import * as chatService from "../services/chat.service";

type ChatRole = "ADMIN" | "MEMBER";

const unauthorized = (res: Response) =>
	res.status(401).json({
		success: false,
		message: "Unauthorized",
	});

export const listChats = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const data = await chatService.listUserChats(req.user.userId);
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const getChat = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const chatId = String(req.params.chatId);
		const data = await chatService.getChatDetails(chatId, req.user.userId);
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const createDirect = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const { userId } = req.body as { userId: string };
		const data = await chatService.createDirectChat(req.user.userId, userId);
		return res.status(201).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const createSolo = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const { model } = req.body as { model?: string };
		const { fresh, name } = req.body as { model?: string; fresh?: boolean; name?: string };
		const data = await chatService.getOrCreateSoloChat(req.user.userId, model, {
			fresh,
			name,
		});
		return res.status(201).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const createGroup = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const { name, description, members, aiModel } = req.body as {
			name: string;
			description?: string;
			members?: string[];
			aiModel?: string;
		};

		const data = await chatService.createGroupChat({
			name,
			description,
			members,
			aiModel,
			createdById: req.user.userId,
		});

		return res.status(201).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const updateChat = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const { name, description, aiModel } = req.body as {
			name?: string;
			description?: string;
			aiModel?: string;
		};

		const chatId = String(req.params.chatId);
		const data = await chatService.updateChat(chatId, req.user.userId, {
			name,
			description,
			aiModel,
		});

		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const deleteChat = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const chatId = String(req.params.chatId);
		const data = await chatService.deleteChat(chatId, req.user.userId);
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const addMember = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const { userId } = req.body as { userId: string };
		const chatId = String(req.params.chatId);
		const data = await chatService.addMember(chatId, req.user.userId, userId);
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const removeMember = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const chatId = String(req.params.chatId);
		const targetUserId = String(req.params.userId);
		const data = await chatService.removeMember(
			chatId,
			req.user.userId,
			targetUserId
		);
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const changeRole = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const role = req.body.role as ChatRole;
		if (!["ADMIN", "MEMBER"].includes(role)) {
			return res.status(400).json({ success: false, message: "Invalid role" });
		}

		const chatId = String(req.params.chatId);
		const targetUserId = String(req.params.userId);
		const data = await chatService.changeMemberRole(
			chatId,
			req.user.userId,
			targetUserId,
			role
		);
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const exportChat = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const format = (req.query.format as "json" | "markdown") || "json";
		const chatId = String(req.params.chatId);
		const data = await chatService.exportChat(chatId, req.user.userId, format);
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const importChat = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const { sourceModel, format, name, messages } = req.body as {
			sourceModel?: string;
			format: string;
			name?: string;
			messages: Array<{ role: string; content: string; createdAt?: string; modelUsed?: string }>;
		};

		const data = await chatService.importConversation({
			userId: req.user.userId,
			sourceModel,
			format,
			name,
			messages,
		});

		return res.status(201).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user?.userId) {
			return unauthorized(res);
		}

		const query = (req.query.q as string) || "";
		const data = await chatService.getUsersForPicker(query, req.user.userId);
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const onlineUsers = async (_req: AuthRequest, res: Response) => {
	try {
		const data = await chatService.getOnlineUsers();
		return res.status(200).json({ success: true, data });
	} catch (error: any) {
		return res.status(400).json({ success: false, message: error.message });
	}
};
