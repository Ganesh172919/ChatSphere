import { PresenceStatus } from "../generated/prisma/client";
import type { Server, Socket } from "socket.io";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { roomsService } from "../modules/rooms/rooms.service";
import { AppError } from "../helpers/app-error";
import type { SocketUser } from "./socket-auth";

type Ack = (payload: { success: boolean; error?: string; data?: unknown }) => void;

const activeSockets = new Map<string, Set<string>>();

const addActiveSocket = async (userId: string, socketId: string) => {
  const sockets = activeSockets.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  activeSockets.set(userId, sockets);
  await prisma.user.update({
    where: { id: userId },
    data: {
      presenceStatus: PresenceStatus.ONLINE,
      lastSeenAt: new Date()
    }
  });
};

const removeActiveSocket = async (userId: string, socketId: string) => {
  const sockets = activeSockets.get(userId);
  if (!sockets) {
    return;
  }

  sockets.delete(socketId);
  if (sockets.size === 0) {
    activeSockets.delete(userId);
    await prisma.user.update({
      where: { id: userId },
      data: {
        presenceStatus: PresenceStatus.OFFLINE,
        lastSeenAt: new Date()
      }
    });
  }
};

const emitRoomUsers = async (io: Server, roomId: string) => {
  const membership = await prisma.roomMember.findMany({
    where: { roomId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          presenceStatus: true
        }
      }
    }
  });

  io.to(roomId).emit("room_users", membership.map((entry) => entry.user));
};

const withAck = async (socket: Socket, ack: Ack | undefined, handler: () => Promise<unknown>) => {
  try {
    const data = await handler();
    ack?.({ success: true, data });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Unexpected socket error";
    socket.emit("error_message", { error: message });
    ack?.({ success: false, error: message });
  }
};

const requireJoinedRoom = (socket: Socket, roomId: string) => {
  if (!socket.rooms.has(roomId)) {
    throw new AppError(403, "ROOM_NOT_JOINED", "Socket must join the room before sending realtime events");
  }
};

export const registerSocketHandlers = (io: Server, socket: Socket) => {
  const user = socket.data.user as SocketUser;

  void addActiveSocket(user.sub, socket.id);
  io.emit("user_status_change", {
    userId: user.sub,
    status: "ONLINE"
  });

  socket.on("authenticate", (ack?: Ack) => {
    ack?.({
      success: true,
      data: {
        user: {
          id: user.sub,
          username: user.username,
          email: user.email
        }
      }
    });
  });

  socket.on("join_room", (roomId: string, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      await roomsService.getRoom(user.sub, roomId);
      const activeRoomId = socket.data.activeRoomId as string | undefined;
      if (activeRoomId && activeRoomId !== roomId) {
        socket.leave(activeRoomId);
        socket.to(activeRoomId).emit("user_left", { roomId: activeRoomId, userId: user.sub });
      }

      socket.join(roomId);
      socket.data.activeRoomId = roomId;
      socket.to(roomId).emit("user_joined", { roomId, userId: user.sub });
      await emitRoomUsers(io, roomId);
      return { roomId };
    });
  });

  socket.on("leave_room", (roomId: string, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      socket.leave(roomId);
      if (socket.data.activeRoomId === roomId) {
        socket.data.activeRoomId = undefined;
      }
      socket.to(roomId).emit("user_left", { roomId, userId: user.sub });
      await emitRoomUsers(io, roomId);
      return { roomId };
    });
  });

  socket.on("typing_start", (payload: { roomId: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      await roomsService.getRoom(user.sub, payload.roomId);
      socket.to(payload.roomId).emit("typing_start", { roomId: payload.roomId, userId: user.sub, username: user.username });
      return payload;
    });
  });

  socket.on("typing_stop", (payload: { roomId: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      await roomsService.getRoom(user.sub, payload.roomId);
      socket.to(payload.roomId).emit("typing_stop", { roomId: payload.roomId, userId: user.sub, username: user.username });
      return payload;
    });
  });

  socket.on("send_message", (payload: { roomId: string; content: string; replyToId?: string; uploadId?: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      const message = await roomsService.createMessage(user.sub, payload.roomId, payload);
      io.to(payload.roomId).emit("receive_message", message);
      return { message };
    });
  });

  socket.on("reply_message", (payload: { roomId: string; content: string; replyToId: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      const message = await roomsService.createMessage(user.sub, payload.roomId, payload);
      io.to(payload.roomId).emit("receive_message", message);
      return { message };
    });
  });

  socket.on("add_reaction", (payload: { roomId: string; messageId: string; emoji: "THUMBS_UP" | "FIRE" | "MIND_BLOWN" | "IDEA" }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      const message = await roomsService.toggleReaction(user.sub, payload.roomId, payload.messageId, payload.emoji);
      io.to(payload.roomId).emit("reaction_update", message);
      return { message };
    });
  });

  socket.on("mark_read", (payload: { roomId: string; messageIds: string[] }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      const receipts = await roomsService.markRead(user.sub, payload.roomId, payload.messageIds);
      io.to(payload.roomId).emit("message_read", {
        roomId: payload.roomId,
        userId: user.sub,
        receipts
      });
      return { receipts };
    });
  });

  socket.on("edit_message", (payload: { roomId: string; messageId: string; newContent: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      const message = await roomsService.editMessage(user.sub, payload.roomId, payload.messageId, payload.newContent);
      io.to(payload.roomId).emit("message_edited", message);
      return { message };
    });
  });

  socket.on("delete_message", (payload: { roomId: string; messageId: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      const message = await roomsService.deleteMessage(user.sub, payload.roomId, payload.messageId);
      io.to(payload.roomId).emit("message_deleted", message);
      return { message };
    });
  });

  socket.on("pin_message", (payload: { roomId: string; messageId: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      const message = await roomsService.pinMessage(user.sub, payload.roomId, payload.messageId, true);
      io.to(payload.roomId).emit("message_pinned", message);
      return { message };
    });
  });

  socket.on("unpin_message", (payload: { roomId: string; messageId: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      const message = await roomsService.pinMessage(user.sub, payload.roomId, payload.messageId, false);
      io.to(payload.roomId).emit("message_unpinned", message);
      return { message };
    });
  });

  socket.on("trigger_ai", (payload: { roomId: string; prompt: string; modelId?: string }, ack?: Ack) => {
    void withAck(socket, ack, async () => {
      requireJoinedRoom(socket, payload.roomId);
      io.to(payload.roomId).emit("ai_thinking", { roomId: payload.roomId, status: true });
      const result = await roomsService.createAiMessage(user.sub, payload.roomId, payload.prompt, payload.modelId);
      io.to(payload.roomId).emit("ai_response", result.message);
      io.to(payload.roomId).emit("ai_thinking", { roomId: payload.roomId, status: false });
      return result;
    });
  });

  socket.on("disconnect", (reason) => {
    const activeRoomId = socket.data.activeRoomId as string | undefined;
    void removeActiveSocket(user.sub, socket.id)
      .then(async () => {
        if (activeRoomId) {
          socket.to(activeRoomId).emit("user_left", { roomId: activeRoomId, userId: user.sub });
          await emitRoomUsers(io, activeRoomId);
        }
        io.emit("user_status_change", {
          userId: user.sub,
          status: activeSockets.has(user.sub) ? "ONLINE" : "OFFLINE"
        });
      })
      .catch((error) => {
        logger.error({ err: error, socketId: socket.id, reason }, "Socket disconnect cleanup failed");
      });
  });
};
