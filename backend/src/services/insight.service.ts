import { prisma } from "../lib/prisma";
import { ensureChatAccess } from "./chat.service";
import { generateAIResponse } from "./ai.service";

const scoreSentiment = (text: string) => {
    const positiveWords = ["great", "good", "thanks", "awesome", "love", "excellent", "happy"];
    const negativeWords = ["bad", "issue", "error", "problem", "hate", "sad", "angry"];

    const value = text.toLowerCase();
    const pos = positiveWords.reduce((acc, word) => acc + (value.includes(word) ? 1 : 0), 0);
    const neg = negativeWords.reduce((acc, word) => acc + (value.includes(word) ? 1 : 0), 0);

    if (pos > neg) {
        return "positive";
    }
    if (neg > pos) {
        return "negative";
    }
    return "neutral";
};

const keywordExtract = (messages: string[]) => {
    const stopWords = new Set([
        "the",
        "and",
        "for",
        "you",
        "that",
        "this",
        "with",
        "are",
        "was",
        "have",
        "from",
        "they",
        "your",
        "chat",
        "just",
    ]);

    const freq = new Map<string, number>();

    for (const message of messages) {
        const words = message
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((word) => word.length > 2 && !stopWords.has(word));

        for (const word of words) {
            freq.set(word, (freq.get(word) || 0) + 1);
        }
    }

    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word, count]) => ({ word, count }));
};

export const getInsights = async (chatId: string, userId: string) => {
    await ensureChatAccess(chatId, userId);

    return prisma.conversationInsight.findMany({
        where: { chatId },
        orderBy: { generatedAt: "desc" },
        take: 10,
    });
};

export const generateInsights = async (chatId: string, userId: string) => {
    await ensureChatAccess(chatId, userId);

    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        take: 120,
        include: {
            sender: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!messages.length) {
        throw new Error("No messages available for analysis");
    }

    const transcript = messages
        .map((message) => `${message.sender.name || message.sender.email}: ${message.content}`)
        .join("\n");

    let summary = "";
    try {
        const ai = await generateAIResponse({
            messages: [
                {
                    role: "system",
                    content:
                        "Summarize this conversation in 5 concise bullet points and include 1 action item.",
                },
                {
                    role: "user",
                    content: transcript.slice(-12000),
                },
            ],
        });

        summary = ai.content;
    } catch {
        summary = transcript.slice(0, 800);
    }

    const sentiment = scoreSentiment(transcript);
    const keywords = keywordExtract(messages.map((message) => message.content));

    return prisma.conversationInsight.create({
        data: {
            chatId,
            summary,
            sentiment,
            keywords: JSON.stringify(keywords),
        },
    });
};
