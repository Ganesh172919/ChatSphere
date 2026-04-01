import type { Request, Response } from "express";
import { ok } from "../../helpers/api-response";
import { requireStringParam } from "../../helpers/request";
import { roomsService } from "./rooms.service";

export const roomsController = {
  async createRoom(request: Request, response: Response) {
    const room = await roomsService.createRoom(request.user!.sub, request.body);
    response.status(201).json(ok({ room }));
  },

  async listRooms(request: Request, response: Response) {
    const rooms = await roomsService.listRooms(request.user!.sub);
    response.json(ok({ rooms }));
  },

  async getRoom(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const room = await roomsService.getRoom(request.user!.sub, roomId);
    response.json(ok({ room }));
  },

  async addMember(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const room = await roomsService.addMember(request.user!.sub, roomId, request.body);
    response.json(ok({ room }));
  },

  async leaveRoom(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    await roomsService.leaveRoom(request.user!.sub, roomId);
    response.status(204).send();
  },

  async listMessages(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const { limit } = request.query as unknown as { limit: number };
    const messages = await roomsService.listMessages(request.user!.sub, roomId, limit);
    response.json(ok({ messages }));
  },

  async createMessage(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const message = await roomsService.createMessage(request.user!.sub, roomId, request.body);
    response.status(201).json(ok({ message }));
  },

  async editMessage(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const messageId = requireStringParam(request.params.messageId, "messageId");
    const message = await roomsService.editMessage(
      request.user!.sub,
      roomId,
      messageId,
      request.body.content
    );
    response.json(ok({ message }));
  },

  async deleteMessage(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const messageId = requireStringParam(request.params.messageId, "messageId");
    const message = await roomsService.deleteMessage(request.user!.sub, roomId, messageId);
    response.json(ok({ message }));
  },

  async reaction(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const messageId = requireStringParam(request.params.messageId, "messageId");
    const message = await roomsService.toggleReaction(
      request.user!.sub,
      roomId,
      messageId,
      request.body.emoji
    );
    response.json(ok({ message }));
  },

  async markRead(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const receipts = await roomsService.markRead(request.user!.sub, roomId, request.body.messageIds);
    response.json(ok({ receipts }));
  },

  async pinMessage(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const messageId = requireStringParam(request.params.messageId, "messageId");
    const message = await roomsService.pinMessage(request.user!.sub, roomId, messageId, true);
    response.json(ok({ message }));
  },

  async unpinMessage(request: Request, response: Response) {
    const roomId = requireStringParam(request.params.roomId, "roomId");
    const messageId = requireStringParam(request.params.messageId, "messageId");
    const message = await roomsService.pinMessage(request.user!.sub, roomId, messageId, false);
    response.json(ok({ message }));
  },

  async searchMessages(request: Request, response: Response) {
    const query = request.query as unknown as { roomId: string; query: string; limit: number };
    const messages = await roomsService.searchMessages(request.user!.sub, query.roomId, query.query, query.limit);
    response.json(ok({ messages }));
  }
};
