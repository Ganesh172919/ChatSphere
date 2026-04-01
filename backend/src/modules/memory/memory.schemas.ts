import { z } from "zod";

export const createMemorySchema = z.object({
  summary: z.string().trim().min(3).max(180),
  content: z.string().trim().min(3).max(2000),
  keywords: z.array(z.string().trim().min(2).max(30)).max(10).default([]),
  score: z.number().min(0).max(1).optional(),
  roomId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional()
});

export const listMemoryQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  roomId: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const extractMemorySchema = z.object({
  content: z.string().trim().min(3).max(4000),
  roomId: z.string().cuid().optional()
});
