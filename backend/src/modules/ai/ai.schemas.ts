import { z } from "zod";

export const aiChatSchema = z.object({
  prompt: z.string().trim().min(3).max(4000),
  context: z.string().trim().max(8000).optional(),
  roomId: z.string().cuid().optional(),
  conversationId: z.string().cuid().optional(),
  model: z.string().trim().min(2).max(100).optional()
});

export const aiInsightSchema = z.object({
  text: z.string().trim().min(3).max(8000),
  roomId: z.string().cuid().optional()
});
