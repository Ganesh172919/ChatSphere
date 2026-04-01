import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { aiProviderRegistry } from "../../services/ai/ai-provider-registry";
import { memoryService } from "../memory/memory.service";

interface AIChatInput {
  prompt: string;
  context?: string;
  roomId?: string;
  conversationId?: string;
  model?: string;
}

const appendConversationEntries = (
  existing: Prisma.JsonValue | null,
  entries: Array<{ role: "user" | "assistant"; content: string; timestamp: string }>
) => {
  const current = Array.isArray(existing) ? existing : [];
  return [...current, ...entries];
};

export const aiService = {
  async chat(userId: string, input: AIChatInput) {
    const memory = await memoryService.getRelevant(userId, input.prompt, input.roomId);
    const provider = aiProviderRegistry.resolve();
    const result = await provider.generate({
      prompt: input.prompt,
      context: input.context,
      memory,
      model: input.model
    });

    const now = new Date().toISOString();

    if (input.conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, userId }
      });

      if (conversation) {
        await prisma.conversation.update({
          where: { id: input.conversationId },
          data: {
            title: conversation.title || input.prompt.slice(0, 80),
            entries: appendConversationEntries(conversation.entries, [
              { role: "user", content: input.prompt, timestamp: now },
              { role: "assistant", content: result.content, timestamp: now }
            ])
          }
        });
      }
    } else {
      await prisma.conversation.create({
        data: {
          userId,
          roomId: input.roomId,
          title: input.prompt.slice(0, 80),
          entries: [
            { role: "user", content: input.prompt, timestamp: now },
            { role: "assistant", content: result.content, timestamp: now }
          ]
        }
      });
    }

    if (result.extractedMemory[0]) {
      await memoryService.create(userId, {
        summary: result.extractedMemory[0].slice(0, 140),
        content: result.extractedMemory[0],
        keywords: result.extractedMemory[0]
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length > 4)
          .slice(0, 6),
        roomId: input.roomId,
        score: 0.62
      });
    }

    return {
      ...result,
      memory
    };
  },

  async smartReplies(userId: string, prompt: string, roomId?: string) {
    const result = await aiService.chat(userId, { prompt, roomId });
    return result.smartReplies;
  },

  async insights(userId: string, text: string, roomId?: string) {
    const provider = aiProviderRegistry.resolve();
    const memory = await memoryService.getRelevant(userId, text, roomId);
    const result = await provider.generate({
      prompt: `Generate concise insights for: ${text}`,
      memory
    });

    return {
      insights: result.insights,
      memory
    };
  }
};
