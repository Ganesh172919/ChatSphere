import {
  AIProviderType,
  MessageStatus,
  MessageType,
  Prisma,
  ReactionEmoji,
  RoomMemberRole,
  UploadVisibility
} from "../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../helpers/app-error";
import { createSlug } from "../../helpers/slug";
import { memoryService } from "../memory/memory.service";
import { aiService } from "../ai/ai.service";
import { roomAuthorizationService } from "../../services/rooms/room-authorization.service";

const roomMemberInclude = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      presenceStatus: true
    }
  }
} satisfies Prisma.RoomMemberInclude;

const messageInclude = {
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true
    }
  },
  parentMessage: {
    select: {
      id: true,
      content: true,
      authorName: true
    }
  },
  upload: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true
    }
  },
  readReceipts: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true
        }
      }
    }
  },
  reactions: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true
        }
      }
    }
  }
} satisfies Prisma.MessageInclude;

const getRoomMember = (roomId: string, userId: string) =>
  prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId
      }
    }
  });

const groupReactions = (
  reactions: Array<{
    emoji: ReactionEmoji;
    user: { id: string; username: string; displayName: string | null };
  }>
) =>
  Object.entries(
    reactions.reduce<Record<string, Array<{ id: string; username: string; displayName: string | null }>>>(
      (accumulator, reaction) => {
        accumulator[reaction.emoji] ??= [];
        const users = accumulator[reaction.emoji];
        if (users) {
          users.push(reaction.user);
        }
        return accumulator;
      },
      {}
    )
  ).map(([emoji, users]) => ({
    emoji,
    users,
    count: users.length
  }));

const serializeMessage = (
  message: Prisma.MessageGetPayload<{
    include: typeof messageInclude;
  }>
) => ({
  id: message.id,
  roomId: message.roomId,
  author: message.author
    ? {
        id: message.author.id,
        username: message.author.username,
        displayName: message.author.displayName,
        avatarUrl: message.author.avatarUrl
      }
    : null,
  authorName: message.authorName,
  content: message.content,
  messageType: message.messageType,
  status: message.status,
  isPinned: message.isPinned,
  pinnedAt: message.pinnedAt,
  editedAt: message.editedAt,
  deletedAt: message.deletedAt,
  aiProvider: message.aiProvider,
  aiModel: message.aiModel,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  replyTo: message.parentMessage
    ? {
        id: message.parentMessage.id,
        content: message.parentMessage.content,
        authorName: message.parentMessage.authorName
      }
    : null,
  upload: message.upload,
  readBy: message.readReceipts.map((receipt) => ({
    user: receipt.user,
    readAt: receipt.readAt
  })),
  reactions: groupReactions(message.reactions)
});

const ensureMessagePermission = async (roomId: string, userId: string) => {
  const member = await getRoomMember(roomId, userId);
  return roomAuthorizationService.requireMembership(member);
};

const ensureAdminPermission = async (roomId: string, userId: string) => {
  const member = await getRoomMember(roomId, userId);
  return roomAuthorizationService.requireRole(member, RoomMemberRole.ADMIN);
};

const ensureUploadAccess = async (uploadId: string, roomId: string, userId: string) => {
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId }
  });

  if (!upload) {
    throw new AppError(404, "UPLOAD_NOT_FOUND", "Upload not found");
  }

  if (upload.ownerId !== userId && upload.roomId !== roomId) {
    throw new AppError(403, "UPLOAD_ACCESS_DENIED", "Upload does not belong to this room");
  }

  return upload;
};

export const roomsService = {
  async createRoom(
    userId: string,
    input: { name: string; description?: string; visibility: "PRIVATE" | "INTERNAL" | "PUBLIC"; tags: string[]; maxMembers: number }
  ) {
    const baseSlug = createSlug(input.name);
    const slug = `${baseSlug || "room"}-${Date.now().toString(36)}`;

    const room = await prisma.$transaction(async (transaction) => {
      const createdRoom = await transaction.room.create({
        data: {
          name: input.name,
          description: input.description,
          visibility: input.visibility,
          tags: input.tags,
          maxMembers: input.maxMembers,
          slug,
          creatorId: userId
        }
      });

      await transaction.roomMember.create({
        data: {
          roomId: createdRoom.id,
          userId,
          role: RoomMemberRole.OWNER
        }
      });

      return createdRoom;
    });

    return roomsService.getRoom(userId, room.id);
  },

  async listRooms(userId: string) {
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            members: {
              include: roomMemberInclude
            },
            _count: {
              select: {
                messages: true
              }
            }
          }
        }
      },
      orderBy: {
        room: {
          updatedAt: "desc"
        }
      }
    });

    return memberships.map((membership) => ({
      id: membership.room.id,
      name: membership.room.name,
      slug: membership.room.slug,
      description: membership.room.description,
      visibility: membership.room.visibility,
      tags: membership.room.tags,
      maxMembers: membership.room.maxMembers,
      lastMessageAt: membership.room.lastMessageAt,
      role: membership.role,
      memberCount: membership.room.members.length,
      messageCount: membership.room._count.messages
    }));
  },

  async getRoom(userId: string, roomId: string) {
    await ensureMessagePermission(roomId, userId);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: roomMemberInclude,
          orderBy: { joinedAt: "asc" }
        },
        messages: {
          include: messageInclude,
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
    }

    return {
      id: room.id,
      name: room.name,
      slug: room.slug,
      description: room.description,
      visibility: room.visibility,
      tags: room.tags,
      maxMembers: room.maxMembers,
      lastMessageAt: room.lastMessageAt,
      members: room.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user
      })),
      messages: room.messages.reverse().map(serializeMessage)
    };
  },

  async addMember(userId: string, roomId: string, input: { userId: string; role: "ADMIN" | "MEMBER" }) {
    await ensureAdminPermission(roomId, userId);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          select: { id: true }
        }
      }
    });

    if (!room) {
      throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
    }

    if (room.members.length >= room.maxMembers) {
      throw new AppError(409, "ROOM_FULL", "Room is already at capacity");
    }

    await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: input.userId
        }
      },
      update: {
        role: input.role
      },
      create: {
        roomId,
        userId: input.userId,
        role: input.role
      }
    });

    return roomsService.getRoom(userId, roomId);
  },

  async leaveRoom(userId: string, roomId: string) {
    const member = await ensureMessagePermission(roomId, userId);
    if (member.role === RoomMemberRole.OWNER) {
      throw new AppError(409, "OWNER_CANNOT_LEAVE", "Transfer ownership before leaving the room");
    }

    await prisma.roomMember.delete({
      where: { id: member.id }
    });
  },

  async listMessages(userId: string, roomId: string, limit = 50) {
    await ensureMessagePermission(roomId, userId);

    const messages = await prisma.message.findMany({
      where: { roomId },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return messages.reverse().map(serializeMessage);
  },

  async createMessage(
    userId: string,
    roomId: string,
    input: { content: string; replyToId?: string; uploadId?: string }
  ) {
    const member = await ensureMessagePermission(roomId, userId);
    const author = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, displayName: true }
    });

    if (!author) {
      throw new AppError(404, "USER_NOT_FOUND", "User not found");
    }

    if (input.replyToId) {
      const replyTarget = await prisma.message.findFirst({
        where: { id: input.replyToId, roomId },
        select: { id: true }
      });
      if (!replyTarget) {
        throw new AppError(404, "REPLY_TARGET_NOT_FOUND", "Reply target does not belong to this room");
      }
    }

    if (input.uploadId) {
      await ensureUploadAccess(input.uploadId, roomId, userId);
    }

    const message = await prisma.message.create({
      data: {
        roomId,
        authorId: userId,
        authorName: author.displayName ?? author.username,
        content: input.content,
        parentMessageId: input.replyToId,
        uploadId: input.uploadId,
        status: MessageStatus.SENT
      },
      include: messageInclude
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { lastMessageAt: message.createdAt }
    });

    if (member.role !== RoomMemberRole.OWNER && input.content.length >= 24) {
      await memoryService.extractFromContent(userId, input.content, roomId);
    }

    return serializeMessage(message);
  },

  async createAiMessage(userId: string, roomId: string, prompt: string, model?: string) {
    await ensureMessagePermission(roomId, userId);
    const result = await aiService.chat(userId, {
      roomId,
      prompt,
      model,
      context: `Room AI request for room ${roomId}`
    });

    const message = await prisma.message.create({
      data: {
        roomId,
        authorId: null,
        authorName: "AI Assistant",
        content: result.content,
        messageType: MessageType.AI,
        status: MessageStatus.SENT,
        aiProvider: AIProviderType.MOCK,
        aiModel: result.model,
        triggeredByUserId: userId
      },
      include: messageInclude
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { lastMessageAt: message.createdAt }
    });

    return {
      message: serializeMessage(message),
      meta: {
        provider: result.provider,
        model: result.model,
        smartReplies: result.smartReplies,
        insights: result.insights,
        memory: result.memory
      }
    };
  },

  async editMessage(userId: string, roomId: string, messageId: string, content: string) {
    await ensureMessagePermission(roomId, userId);
    const message = await prisma.message.findFirst({
      where: { id: messageId, roomId }
    });

    if (!message) {
      throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found");
    }

    const member = await getRoomMember(roomId, userId);
    const isOwner = message.authorId === userId;
    const isAdmin = member?.role === RoomMemberRole.ADMIN || member?.role === RoomMemberRole.OWNER;
    if (!isOwner && !isAdmin) {
      throw new AppError(403, "MESSAGE_EDIT_FORBIDDEN", "You cannot edit this message");
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: {
        content,
        editedAt: new Date()
      },
      include: messageInclude
    });

    return serializeMessage(updated);
  },

  async deleteMessage(userId: string, roomId: string, messageId: string) {
    await ensureMessagePermission(roomId, userId);
    const message = await prisma.message.findFirst({
      where: { id: messageId, roomId }
    });

    if (!message) {
      throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found");
    }

    const member = await getRoomMember(roomId, userId);
    const isOwner = message.authorId === userId;
    const isAdmin = member?.role === RoomMemberRole.ADMIN || member?.role === RoomMemberRole.OWNER;
    if (!isOwner && !isAdmin) {
      throw new AppError(403, "MESSAGE_DELETE_FORBIDDEN", "You cannot delete this message");
    }

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: {
        content: "[deleted]",
        deletedAt: new Date(),
        status: MessageStatus.DELETED
      },
      include: messageInclude
    });

    return serializeMessage(updated);
  },

  async toggleReaction(userId: string, roomId: string, messageId: string, emoji: keyof typeof ReactionEmoji) {
    await ensureMessagePermission(roomId, userId);
    const message = await prisma.message.findFirst({
      where: { id: messageId, roomId },
      select: { id: true }
    });

    if (!message) {
      throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found");
    }

    const existing = await prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId,
        emoji
      }
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji
        }
      });
    }

    const updated = await prisma.message.findUniqueOrThrow({
      where: { id: messageId },
      include: messageInclude
    });

    return serializeMessage(updated);
  },

  async markRead(userId: string, roomId: string, messageIds: string[]) {
    await ensureMessagePermission(roomId, userId);

    const roomMessageIds = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
        roomId
      },
      select: { id: true }
    });

    await prisma.messageRead.createMany({
      data: roomMessageIds.map((message) => ({
        messageId: message.id,
        userId
      })),
      skipDuplicates: true
    });

    await prisma.message.updateMany({
      where: {
        id: { in: roomMessageIds.map((message) => message.id) }
      },
      data: {
        status: MessageStatus.READ
      }
    });

    return prisma.messageRead.findMany({
      where: {
        messageId: { in: roomMessageIds.map((message) => message.id) },
        userId
      }
    });
  },

  async pinMessage(userId: string, roomId: string, messageId: string, pinned: boolean) {
    await ensureAdminPermission(roomId, userId);
    const message = await prisma.message.findFirst({
      where: { id: messageId, roomId }
    });

    if (!message) {
      throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found");
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isPinned: pinned,
        pinnedById: pinned ? userId : null,
        pinnedAt: pinned ? new Date() : null
      },
      include: messageInclude
    });

    return serializeMessage(updated);
  },

  async searchMessages(userId: string, roomId: string, query: string, limit = 20) {
    // This explicitly fixes the original search auth gap by requiring membership before any search runs.
    await ensureMessagePermission(roomId, userId);

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        deletedAt: null,
        content: {
          contains: query,
          mode: "insensitive"
        }
      },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: limit
    });

    return messages.map(serializeMessage);
  },

  async createRoomUpload(userId: string, roomId: string) {
    const member = await ensureMessagePermission(roomId, userId);
    return {
      allowed: true,
      role: member.role,
      visibility: UploadVisibility.ROOM
    };
  }
};
