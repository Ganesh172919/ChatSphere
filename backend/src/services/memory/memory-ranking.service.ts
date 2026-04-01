import type { MemoryEntry } from "../../generated/prisma/client";

const tokenize = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2)
  );

export const memoryRankingService = {
  score(entry: Pick<MemoryEntry, "content" | "summary" | "keywords" | "score">, query: string) {
    const queryTerms = tokenize(query);
    const memoryTerms = new Set([
      ...tokenize(entry.content),
      ...tokenize(entry.summary),
      ...entry.keywords.map((keyword) => keyword.toLowerCase())
    ]);

    let overlaps = 0;
    for (const term of queryTerms) {
      if (memoryTerms.has(term)) {
        overlaps += 1;
      }
    }

    const normalized = queryTerms.size === 0 ? 0 : overlaps / queryTerms.size;
    return Number((entry.score * 0.65 + normalized * 0.35).toFixed(4));
  }
};
