import { MemorySource } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { memoryRankingService } from "../../services/memory/memory-ranking.service";

interface CreateMemoryInput {
  summary: string;
  content: string;
  keywords: string[];
  score?: number;
  roomId?: string;
  projectId?: string;
}

export const memoryService = {
  async create(userId: string, input: CreateMemoryInput) {
    return prisma.memoryEntry.create({
      data: {
        userId,
        roomId: input.roomId,
        projectId: input.projectId,
        summary: input.summary,
        content: input.content,
        keywords: input.keywords,
        score: input.score ?? 0.65,
        source: input.roomId ? MemorySource.ROOM : MemorySource.CHAT
      }
    });
  },

  async extractFromContent(userId: string, content: string, roomId?: string) {
    const summary = content.slice(0, 140);
    const keywords = Array.from(
      new Set(
        content
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length > 4)
      )
    ).slice(0, 8);

    return memoryService.create(userId, {
      summary,
      content,
      keywords,
      roomId,
      score: 0.6
    });
  },

  async list(userId: string, query?: string, roomId?: string, limit = 20) {
    const entries = await prisma.memoryEntry.findMany({
      where: {
        userId,
        roomId
      },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      take: Math.min(limit, 50)
    });

    if (!query) {
      return entries;
    }

    return entries
      .map((entry) => ({
        ...entry,
        computedScore: memoryRankingService.score(entry, query)
      }))
      .sort((left, right) => right.computedScore - left.computedScore);
  },

  async getRelevant(userId: string, query: string, roomId?: string, limit = 5) {
    const entries = await memoryService.list(userId, query, roomId, 25);
    const topEntries = entries.slice(0, limit);

    if (topEntries.length > 0) {
      await prisma.memoryEntry.updateMany({
        where: {
          id: { in: topEntries.map((entry) => entry.id) }
        },
        data: {
          lastUsedAt: new Date()
        }
      });
    }

    return topEntries.map((entry) => ({
      id: entry.id,
      summary: entry.summary,
      score:
        typeof (entry as unknown as { computedScore?: unknown }).computedScore === "number"
          ? (entry as unknown as { computedScore: number }).computedScore
          : entry.score
    }));
  }
};
