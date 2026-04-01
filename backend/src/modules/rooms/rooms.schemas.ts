import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(500).optional(),
  visibility: z.enum(["PRIVATE", "INTERNAL", "PUBLIC"]).default("PRIVATE"),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  maxMembers: z.number().int().min(2).max(100).default(20)
});

export const addMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER")
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  replyToId: z.string().cuid().optional(),
  uploadId: z.string().cuid().optional()
});

export const editMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000)
});

export const reactionSchema = z.object({
  emoji: z.enum(["THUMBS_UP", "FIRE", "MIND_BLOWN", "IDEA"])
});

export const markReadSchema = z.object({
  messageIds: z.array(z.string().cuid()).min(1).max(100)
});

export const searchMessagesQuerySchema = z.object({
  roomId: z.string().cuid(),
  query: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});
