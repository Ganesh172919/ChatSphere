type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

export type AIProviderName = "openrouter" | "gemini" | "grok" | "huggingface" | "local";

export type AIResponse = {
    content: string;
    provider: AIProviderName;
    model: string;
    raw?: unknown;
};

const getRequestTimeoutMs = () => {
    const value = Number(process.env.AI_REQUEST_TIMEOUT_MS || "30000");
    return Number.isFinite(value) && value > 0 ? value : 30000;
};

const getContextLimit = () => {
    const value = Number(process.env.AI_CONTEXT_MESSAGE_LIMIT || "18");
    return Number.isFinite(value) && value > 0 ? Math.min(value, 60) : 18;
};

const normalizeMessages = (messages: ChatMessage[]) => {
    const cleaned = messages
        .map((message) => ({
            role: message.role,
            content: String(message.content || "").trim(),
        }))
        .filter((message) => Boolean(message.content));

    if (!cleaned.length) {
        throw new Error("No valid AI messages provided");
    }

    const contextLimit = getContextLimit();
    const system = cleaned.filter((message) => message.role === "system");
    const nonSystem = cleaned.filter((message) => message.role !== "system");

    const trimmedSystem = system.length ? [system[system.length - 1]] : [];
    const trimmedNonSystem = nonSystem.slice(-contextLimit);

    return [...trimmedSystem, ...trimmedNonSystem].map((message) => ({
        ...message,
        content: message.content.slice(0, 12000),
    }));
};

const withTimeout = async <T>(
    provider: string,
    run: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(`${provider} request timed out`), getRequestTimeoutMs());

    try {
        return await run(controller.signal);
    } catch (error: any) {
        if (error?.name === "AbortError") {
            throw new Error(`${provider} request timed out`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

const parseModelMap = (value: string | undefined): Array<{ id: string; label: string; provider: string }> => {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [id, label] = entry.split("=");
            const provider = id.includes("/") ? id.split("/")[0] : "custom";
            return {
                id: id.trim(),
                label: (label || id).trim(),
                provider,
            };
        });
};

export const getAvailableModels = () => {
    const openRouterModels = parseModelMap(process.env.OPENROUTER_MODELS);
    const geminiModels = parseModelMap(process.env.GEMINI_MODELS);
    const groqModels = parseModelMap(process.env.GROQ_MODELS);
    const togetherModels = parseModelMap(process.env.TOGETHER_MODELS);

    const merged = [
        ...openRouterModels,
        ...geminiModels,
        ...groqModels,
        ...togetherModels,
    ];

    const unique = new Map<string, { id: string; label: string; provider: string }>();
    for (const model of merged) {
        if (!unique.has(model.id)) {
            unique.set(model.id, model);
        }
    }

    const defaults = [
        {
            id: process.env.OPENROUTER_DEFAULT_MODEL || process.env.DEFAULT_AI_MODEL || "openai/gpt-4o-mini",
            label: "Default",
            provider: "openrouter",
        },
    ];

    for (const item of defaults) {
        if (!unique.has(item.id)) {
            unique.set(item.id, item);
        }
    }

    return Array.from(unique.values());
};

const openRouterRequest = async (
    messages: ChatMessage[],
    model: string,
    signal: AbortSignal
): Promise<AIResponse> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY missing");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
            "X-Title": "ChatSphere",
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
        }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`OpenRouter failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new Error("OpenRouter returned empty response");
    }

    return {
        content,
        provider: "openrouter",
        model,
        raw: data,
    };
};

const geminiRequest = async (
    messages: ChatMessage[],
    model: string,
    signal: AbortSignal
): Promise<AIResponse> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY missing");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
    )}:generateContent?key=${apiKey}`;

    const prompt = messages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n\n");

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
        }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`Gemini failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
        candidates?: Array<{
            content?: {
                parts?: Array<{ text?: string }>;
            };
        }>;
    };

    const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
    if (!content) {
        throw new Error("Gemini returned empty response");
    }

    return {
        content,
        provider: "gemini",
        model,
        raw: data,
    };
};

const grokRequest = async (
    messages: ChatMessage[],
    model: string,
    signal: AbortSignal
): Promise<AIResponse> => {
    const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
    if (!apiKey) {
        throw new Error("XAI/GROK API key missing");
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: process.env.GROK_MODEL || model || "grok-2-latest",
            messages,
        }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`Grok failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new Error("Grok returned empty response");
    }

    return {
        content,
        provider: "grok",
        model,
        raw: data,
    };
};

const huggingFaceRequest = async (
    messages: ChatMessage[],
    model: string,
    signal: AbortSignal
): Promise<AIResponse> => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
        throw new Error("HUGGINGFACE_API_KEY missing");
    }

    const response = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            inputs: messages.map((message) => `${message.role}: ${message.content}`).join("\n"),
            parameters: {
                max_new_tokens: 600,
            },
        }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`Hugging Face failed with status ${response.status}`);
    }

    const data = (await response.json()) as Array<{ generated_text?: string }>;
    const content = data?.[0]?.generated_text?.trim();

    if (!content) {
        throw new Error("Hugging Face returned empty response");
    }

    return {
        content,
        provider: "huggingface",
        model,
        raw: data,
    };
};

const localFallback = (messages: ChatMessage[], model: string): AIResponse => {
    const latestUser = [...messages].reverse().find((message) => message.role === "user");
    const prompt = latestUser?.content || "";

    return {
        provider: "local",
        model,
        content: [
            "AI provider keys are not configured, so this is a local fallback response.",
            "",
            "Your prompt:",
            prompt,
            "",
            "Set OPENROUTER_API_KEY (recommended) to enable real model outputs.",
        ].join("\n"),
    };
};

export const generateAIResponse = async (input: {
    messages: ChatMessage[];
    model?: string;
}): Promise<AIResponse> => {
    const model =
        input.model ||
        process.env.OPENROUTER_DEFAULT_MODEL ||
        process.env.DEFAULT_AI_MODEL ||
        process.env.GEMINI_MODEL ||
        process.env.GROK_MODEL ||
        process.env.HUGGINGFACE_MODEL ||
        "openai/gpt-4o-mini";

    const messages = normalizeMessages(input.messages);

    const tries: Array<() => Promise<AIResponse>> = [
        () => withTimeout("OpenRouter", (signal) => openRouterRequest(messages, model, signal)),
        () =>
            withTimeout("Gemini", (signal) =>
                geminiRequest(messages, process.env.GEMINI_MODEL || "gemini-2.5-flash", signal)
            ),
        () =>
            withTimeout("Grok", (signal) =>
                grokRequest(messages, process.env.GROK_MODEL || "grok-2-latest", signal)
            ),
        () =>
            withTimeout("HuggingFace", (signal) =>
                huggingFaceRequest(
                    messages,
                    process.env.HUGGINGFACE_MODEL || "meta-llama/Llama-3.1-8B-Instruct",
                    signal
                )
            ),
    ];

    const errors: string[] = [];

    for (const attempt of tries) {
        try {
            return await attempt();
        } catch (error: any) {
            errors.push(error.message || "Unknown AI provider error");
        }
    }

    const fallback = localFallback(messages, model);
    return {
        ...fallback,
        raw: { errors },
    };
};
