import { Router } from "express";
import { asyncHandler } from "../../helpers/async-handler";
import { validateBody, validateQuery } from "../../helpers/validation";
import { requireAuth } from "../../middleware/auth";
import { roomsController } from "./rooms.controller";
import {
  addMemberSchema,
  createMessageSchema,
  createRoomSchema,
  editMessageSchema,
  listMessagesQuerySchema,
  markReadSchema,
  reactionSchema,
  searchMessagesQuerySchema
} from "./rooms.schemas";

export const roomsRouter = Router();

roomsRouter.use(requireAuth);
roomsRouter.get("/", asyncHandler(roomsController.listRooms));
roomsRouter.post("/", validateBody(createRoomSchema), asyncHandler(roomsController.createRoom));
roomsRouter.get("/search/messages", validateQuery(searchMessagesQuerySchema), asyncHandler(roomsController.searchMessages));
roomsRouter.get("/:roomId", asyncHandler(roomsController.getRoom));
roomsRouter.post("/:roomId/members", validateBody(addMemberSchema), asyncHandler(roomsController.addMember));
roomsRouter.delete("/:roomId/members/me", asyncHandler(roomsController.leaveRoom));
roomsRouter.get("/:roomId/messages", validateQuery(listMessagesQuerySchema), asyncHandler(roomsController.listMessages));
roomsRouter.post("/:roomId/messages", validateBody(createMessageSchema), asyncHandler(roomsController.createMessage));
roomsRouter.patch("/:roomId/messages/:messageId", validateBody(editMessageSchema), asyncHandler(roomsController.editMessage));
roomsRouter.delete("/:roomId/messages/:messageId", asyncHandler(roomsController.deleteMessage));
roomsRouter.post("/:roomId/messages/:messageId/reactions", validateBody(reactionSchema), asyncHandler(roomsController.reaction));
roomsRouter.post("/:roomId/messages/read", validateBody(markReadSchema), asyncHandler(roomsController.markRead));
roomsRouter.post("/:roomId/messages/:messageId/pin", asyncHandler(roomsController.pinMessage));
roomsRouter.delete("/:roomId/messages/:messageId/pin", asyncHandler(roomsController.unpinMessage));
