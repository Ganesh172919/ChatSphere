import { env } from "../../config/env";
import type { AIProvider, AIChatRequest, AIChatResult } from "./types";

const trimSentence = (value: string, maxLength = 140) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;

export class MockAIProvider implements AIProvider {
  public async generate(request: AIChatRequest): Promise<AIChatResult> {
    const memoryHints = request.memory?.map((entry) => entry.summary).slice(0, 3) ?? [];
    const prompt = request.prompt.trim();
    const summary = trimSentence(prompt);

    return {
      provider: "mock",
      model: request.model ?? env.AI_DEFAULT_MODEL,
      content: `Mock AI response: ${summary}${memoryHints.length ? ` | memory: ${memoryHints.join("; ")}` : ""}`,
      smartReplies: [
        "Can you expand on that?",
        "What should we prioritize next?",
        "Please summarize the tradeoffs."
      ],
      insights: [
        `Primary topic: ${summary}`,
        memoryHints.length ? `Relevant memory used: ${memoryHints[0]}` : "No stored memory was needed"
      ],
      extractedMemory: [trimSentence(`Remember: ${prompt}`, 120)]
    };
  }
}
