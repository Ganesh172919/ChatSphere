import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { sendAiMessage } from "./ai/gemini.service";

interface MemoryCandidate {
    summary: string;
    details?: string;
    tags: string[];
    confidence?: number;
    importance?: number;
    sourceReferences?: Array<Record<string, unknown>>;
}

interface MemoryFilters {
    search?: string;
    pinned?: boolean;
    limit?: number;
}

const toJsonValue = (value: unknown): Prisma.InputJsonValue => {
    return value as Prisma.InputJsonValue;
};

const buildFingerprint = (userId: string, summary: string): string => {
    return createHash("sha256")
        .update(`${userId}:${summary.trim().toLowerCase()}`)
        .digest("hex");
};

const tokenize = (value: string): string[] => {
    return value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 2);
};

const overlapScore = (left: string[], right: string[]): number => {
    if (left.length === 0 || right.length === 0) {
        return 0;
    }

    const leftSet = new Set(left);
    const common = right.filter((token) => leftSet.has(token)).length;

    return common / Math.max(1, leftSet.size);
};

const extractDeterministicCandidates = (message: string): MemoryCandidate[] => {
    const lines = message
        .split(/[\n.]/)
        .map((line) => line.trim())
        .filter((line) => line.length >= 12);

    const candidates: MemoryCandidate[] = [];

    for (const line of lines) {
        if (/i prefer|my preference|remember that/i.test(line)) {
            candidates.push({
                summary: line,
                details: "Preference extracted from user message",
                tags: ["preference"],
                confidence: 0.75,
                importance: 0.65,
            });
            continue;
        }

        if (/deadline|deliver|ship|due|by\s+\d{1,2}/i.test(line)) {
            candidates.push({
                summary: line,
                details: "Potential commitment or timeline",
                tags: ["timeline", "task"],
                confidence: 0.7,
                importance: 0.8,
            });
            continue;
        }

        if (/my project|working on|building|implementing/i.test(line)) {
            candidates.push({
                summary: line,
                details: "Project context extracted",
                tags: ["project", "context"],
                confidence: 0.7,
                importance: 0.7,
            });
        }
    }

    return candidates.slice(0, 8);
};

const extractAiCandidates = async (message: string): Promise<MemoryCandidate[]> => {
    try {
        const response = await sendAiMessage({
            task: "memory",
            message,
            outputJson: true,
        });

        const parsed = JSON.parse(response.content);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter((item) => item && typeof item.summary === "string")
            .map((item) => ({
                summary: String(item.summary),
                details:
                    typeof item.details === "string"
                        ? item.details
                        : "AI-assisted memory extraction",
                tags: Array.isArray(item.tags)
                    ? item.tags.map((tag: unknown) => String(tag).toLowerCase())
                    : [],
                confidence:
                    typeof item.confidence === "number" ? Number(item.confidence) : 0.6,
                importance:
                    typeof item.importance === "number" ? Number(item.importance) : 0.6,
            }))
            .slice(0, 8);
    } catch {
        return [];
    }
};

export const upsertMemoryCandidates = async (
    userId: string,
    candidates: MemoryCandidate[]
) => {
    const results = [];

    for (const candidate of candidates) {
        const fingerprint = buildFingerprint(userId, candidate.summary);

        const sourceReferences = candidate.sourceReferences ?? [];
        const tags = Array.from(new Set(candidate.tags.map((tag) => tag.toLowerCase())));

        const item = await prisma.memoryEntry.upsert({
            where: {
                userId_fingerprint: {
                    userId,
                    fingerprint,
                },
            },
            create: {
                userId,
                fingerprint,
                summary: candidate.summary,
                details: candidate.details,
                tags: toJsonValue(tags),
                sourceReferences: toJsonValue(sourceReferences),
                confidence: Math.max(0, Math.min(1, candidate.confidence ?? 0.65)),
                importance: Math.max(0, Math.min(1, candidate.importance ?? 0.65)),
                recency: 1,
            },
            update: {
                summary: candidate.summary,
                details: candidate.details,
                tags: toJsonValue(tags),
                sourceReferences: toJsonValue(sourceReferences),
                confidence: Math.max(0, Math.min(1, candidate.confidence ?? 0.65)),
                importance: Math.max(0, Math.min(1, candidate.importance ?? 0.65)),
                recency: 1,
                updatedAt: new Date(),
            },
        });

        results.push(item);
    }

    return results;
};

export const upsertMemoriesFromUserMessage = async (
    userId: string,
    message: string,
    source: Record<string, unknown>
) => {
    const deterministic = extractDeterministicCandidates(message);
    const aiCandidates = await extractAiCandidates(message);

    const mergedMap = new Map<string, MemoryCandidate>();

    for (const candidate of [...deterministic, ...aiCandidates]) {
        const key = candidate.summary.trim().toLowerCase();

        if (!mergedMap.has(key)) {
            mergedMap.set(key, {
                ...candidate,
                sourceReferences: [source],
            });
        }
    }

    return upsertMemoryCandidates(userId, Array.from(mergedMap.values()));
};

export const getRelevantMemories = async (
    userId: string,
    prompt: string,
    topN = 5
) => {
    const entries = await prisma.memoryEntry.findMany({
        where: {
            userId,
        },
        orderBy: {
            updatedAt: "desc",
        },
        take: 100,
    });

    const promptTokens = tokenize(prompt);

    const scored = entries
        .map((entry) => {
            const summaryTokens = tokenize(entry.summary);
            const detailTokens = tokenize(entry.details ?? "");
            const overlap = overlapScore(promptTokens, [...summaryTokens, ...detailTokens]);
            const pinnedBoost = entry.pinned ? 0.2 : 0;
            const usageBoost = Math.min(0.2, entry.usageCount * 0.01);

            const score =
                overlap * 0.4 +
                entry.importance * 0.25 +
                entry.confidence * 0.2 +
                entry.recency * 0.1 +
                pinnedBoost +
                usageBoost;

            return {
                entry,
                score,
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);

    return scored.map((item) => ({
        id: item.entry.id,
        summary: item.entry.summary,
        details: item.entry.details,
        tags: item.entry.tags,
        confidence: item.entry.confidence,
        importance: item.entry.importance,
        score: Number(item.score.toFixed(4)),
    }));
};

export const markMemoriesUsed = async (memoryIds: string[]) => {
    if (memoryIds.length === 0) {
        return;
    }

    await prisma.memoryEntry.updateMany({
        where: {
            id: {
                in: memoryIds,
            },
        },
        data: {
            usageCount: {
                increment: 1,
            },
            lastUsedAt: new Date(),
            recency: 1,
        },
    });
};

export const listMemoryEntries = async (userId: string, filters: MemoryFilters) => {
    const search = filters.search?.trim();
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);

    return prisma.memoryEntry.findMany({
        where: {
            userId,
            ...(typeof filters.pinned === "boolean" ? { pinned: filters.pinned } : {}),
            ...(search
                ? {
                      OR: [
                          {
                              summary: {
                                  contains: search,
                                  mode: "insensitive",
                              },
                          },
                          {
                              details: {
                                  contains: search,
                                  mode: "insensitive",
                              },
                          },
                      ],
                  }
                : {}),
        },
        orderBy: [
            {
                pinned: "desc",
            },
            {
                updatedAt: "desc",
            },
        ],
        take: limit,
    });
};

export const updateMemoryEntry = async (
    userId: string,
    memoryId: string,
    payload: {
        summary?: string;
        details?: string;
        tags?: string[];
        pinned?: boolean;
        confidence?: number;
        importance?: number;
        recency?: number;
    }
) => {
    const existing = await prisma.memoryEntry.findFirst({
        where: {
            id: memoryId,
            userId,
        },
    });

    if (!existing) {
        return null;
    }

    return prisma.memoryEntry.update({
        where: {
            id: memoryId,
        },
        data: {
            summary: payload.summary ?? existing.summary,
            details: payload.details ?? existing.details,
            tags: payload.tags
                ? toJsonValue(payload.tags)
                : toJsonValue(existing.tags ?? []),
            pinned: payload.pinned ?? existing.pinned,
            confidence:
                typeof payload.confidence === "number"
                    ? Math.max(0, Math.min(1, payload.confidence))
                    : existing.confidence,
            importance:
                typeof payload.importance === "number"
                    ? Math.max(0, Math.min(1, payload.importance))
                    : existing.importance,
            recency:
                typeof payload.recency === "number"
                    ? Math.max(0, Math.min(1, payload.recency))
                    : existing.recency,
        },
    });
};

export const deleteMemoryEntry = async (userId: string, memoryId: string) => {
    const result = await prisma.memoryEntry.deleteMany({
        where: {
            id: memoryId,
            userId,
        },
    });

    return result.count > 0;
};

export const previewMemoryImport = async (
    userId: string,
    entries: MemoryCandidate[]
): Promise<{ candidates: MemoryCandidate[]; existingCount: number }> => {
    const fingerprints = entries.map((entry) => buildFingerprint(userId, entry.summary));

    const existingCount = await prisma.memoryEntry.count({
        where: {
            userId,
            fingerprint: {
                in: fingerprints,
            },
        },
    });

    return {
        candidates: entries,
        existingCount,
    };
};

export const exportMemoryEntries = async (
    userId: string,
    format: "json" | "markdown" | "adapter"
): Promise<unknown> => {
    const memories = await prisma.memoryEntry.findMany({
        where: {
            userId,
        },
        orderBy: {
            updatedAt: "desc",
        },
    });

    if (format === "json") {
        return memories;
    }

    if (format === "adapter") {
        return {
            version: 1,
            entries: memories.map((memory) => ({
                key: memory.fingerprint,
                summary: memory.summary,
                details: memory.details,
                tags: memory.tags,
                score: {
                    confidence: memory.confidence,
                    importance: memory.importance,
                    recency: memory.recency,
                },
            })),
        };
    }

    const markdown = memories
        .map((memory, index) => {
            return [
                `## ${index + 1}. ${memory.summary}`,
                memory.details ? `${memory.details}` : "",
                `- Tags: ${Array.isArray(memory.tags) ? memory.tags.join(", ") : "none"}`,
                `- Confidence: ${memory.confidence}`,
                `- Importance: ${memory.importance}`,
                `- Pinned: ${memory.pinned}`,
            ]
                .filter(Boolean)
                .join("\n");
        })
        .join("\n\n");

    return markdown;
};
