import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../helpers/asyncHandler";
import { protect } from "../middleware/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.middleware";
import {
    createRoom,
    deleteRoom,
    getPinnedMessages,
    getRoomById,
    getRoomInsight,
    getRoomsForUser,
    joinRoom,
    leaveRoom,
    pinMessage,
    runRoomAction,
    unpinMessage,
} from "../services/room.service";
import {
    addReaction,
    editMessage,
    getRoomMessages,
    sendRoomMessage,
    softDeleteMessage,
} from "../services/message.service";

const router = Router();

const roomIdParamsSchema = z.object({
    roomId: z.string().uuid(),
});

const roomMessageParamsSchema = z.object({
    roomId: z.string().uuid(),
    messageId: z.string().uuid(),
});

const createRoomSchema = z.object({
    name: z.string().min(3).max(80),
    description: z.string().max(400).optional(),
    tags: z.array(z.string().min(1).max(32)).max(20).optional(),
    maxUsers: z.number().int().min(2).max(5000).optional(),
});

const roomActionSchema = z.object({
    action: z.enum(["summarize", "extract-tasks", "extract-decisions"]),
});

const messageCreateSchema = z.object({
    content: z.string().min(1).max(6000),
    replyTo: z
        .object({
            messageId: z.string().uuid(),
            snippet: z.string().max(400).optional(),
        })
        .optional(),
    file: z
        .object({
            fileUrl: z.string().url().optional(),
            fileName: z.string().max(255).optional(),
            fileType: z.string().max(120).optional(),
            fileSize: z.number().int().min(0).max(5 * 1024 * 1024).optional(),
        })
        .optional(),
});

const messageEditSchema = z.object({
    content: z.string().min(1).max(6000),
});

const reactionBodySchema = z.object({
    emoji: z.string().min(1).max(20),
});

const listMessageQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    skip: z.coerce.number().int().min(0).optional(),
});

router.use(protect);

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const rooms = await getRoomsForUser(req.user!.userId);
        res.status(200).json({ success: true, data: rooms });
    })
);

router.post(
    "/",
    validateBody(createRoomSchema),
    asyncHandler(async (req, res) => {
        const room = await createRoom(req.user!.userId, req.body);
        res.status(201).json({ success: true, data: room, message: "Room created successfully" });
    })
);

router.post(
    "/:roomId/join",
    validateParams(roomIdParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const result = await joinRoom(req.user!.userId, roomId);
        res.status(200).json({ success: true, data: result });
    })
);

router.post(
    "/:roomId/leave",
    validateParams(roomIdParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const result = await leaveRoom(req.user!.userId, roomId);
        res.status(200).json({ success: true, data: result });
    })
);

router.get(
    "/:roomId",
    validateParams(roomIdParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const room = await getRoomById(req.user!.userId, roomId);
        res.status(200).json({ success: true, data: room });
    })
);

router.delete(
    "/:roomId",
    validateParams(roomIdParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const result = await deleteRoom(req.user!.userId, roomId);
        res.status(200).json({ success: true, data: result });
    })
);

router.get(
    "/:roomId/messages",
    validateParams(roomIdParamsSchema),
    validateQuery(listMessageQuerySchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const skip = req.query.skip ? Number(req.query.skip) : undefined;
        const result = await getRoomMessages(
            req.user!.userId,
            roomId,
            limit,
            skip
        );
        res.status(200).json({ success: true, data: result });
    })
);

router.post(
    "/:roomId/messages",
    validateParams(roomIdParamsSchema),
    validateBody(messageCreateSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const message = await sendRoomMessage({
            roomId,
            userId: req.user!.userId,
            content: req.body.content,
            replyTo: req.body.replyTo,
            file: req.body.file,
        });

        res.status(201).json({ success: true, data: message, message: "Message sent" });
    })
);

router.patch(
    "/messages/:messageId",
    validateParams(z.object({ messageId: z.string().uuid() })),
    validateBody(messageEditSchema),
    asyncHandler(async (req, res) => {
        const messageId = String(req.params.messageId);
        const message = await editMessage(req.user!.userId, messageId, req.body.content);
        res.status(200).json({ success: true, data: message, message: "Message updated" });
    })
);

router.delete(
    "/messages/:messageId",
    validateParams(z.object({ messageId: z.string().uuid() })),
    asyncHandler(async (req, res) => {
        const messageId = String(req.params.messageId);
        const result = await softDeleteMessage(req.user!.userId, messageId);
        res.status(200).json({ success: true, data: result, message: "Message deleted" });
    })
);

router.post(
    "/messages/:messageId/reactions",
    validateParams(z.object({ messageId: z.string().uuid() })),
    validateBody(reactionBodySchema),
    asyncHandler(async (req, res) => {
        const messageId = String(req.params.messageId);
        const message = await addReaction(req.user!.userId, messageId, req.body.emoji);
        res.status(200).json({ success: true, data: message });
    })
);

router.get(
    "/:roomId/insights",
    validateParams(roomIdParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const insight = await getRoomInsight(req.user!.userId, roomId);
        res.status(200).json({ success: true, data: insight });
    })
);

router.post(
    "/:roomId/actions",
    validateParams(roomIdParamsSchema),
    validateBody(roomActionSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const result = await runRoomAction(req.user!.userId, roomId, req.body.action);
        res.status(200).json({ success: true, data: result });
    })
);

router.post(
    "/:roomId/pin/:messageId",
    validateParams(roomMessageParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const messageId = String(req.params.messageId);
        const result = await pinMessage(req.user!.userId, roomId, messageId);
        res.status(200).json({ success: true, data: result });
    })
);

router.post(
    "/:roomId/unpin/:messageId",
    validateParams(roomMessageParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const messageId = String(req.params.messageId);
        const result = await unpinMessage(req.user!.userId, roomId, messageId);
        res.status(200).json({ success: true, data: result });
    })
);

router.get(
    "/:roomId/pinned",
    validateParams(roomIdParamsSchema),
    asyncHandler(async (req, res) => {
        const roomId = String(req.params.roomId);
        const result = await getPinnedMessages(req.user!.userId, roomId);
        res.status(200).json({ success: true, data: result });
    })
);

export default router;
