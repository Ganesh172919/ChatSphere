import { env } from "../config/env";

interface QuotaState {
    count: number;
    windowStart: number;
}

interface QuotaResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
}

const quotaWindow = new Map<string, QuotaState>();

const ensureState = (key: string): QuotaState => {
    const now = Date.now();
    const existing = quotaWindow.get(key);

    if (!existing || now - existing.windowStart >= env.aiQuotaWindowMs) {
        const freshState: QuotaState = {
            count: 0,
            windowStart: now,
        };
        quotaWindow.set(key, freshState);
        return freshState;
    }

    return existing;
};

export const consumeAiQuota = (key: string): QuotaResult => {
    const state = ensureState(key);
    const now = Date.now();

    if (state.count >= env.aiQuotaMaxRequests) {
        const retryAfterMs = Math.max(0, env.aiQuotaWindowMs - (now - state.windowStart));

        return {
            allowed: false,
            remaining: 0,
            retryAfterMs,
        };
    }

    state.count += 1;

    return {
        allowed: true,
        remaining: Math.max(0, env.aiQuotaMaxRequests - state.count),
        retryAfterMs: 0,
    };
};

export const getAiQuotaKey = (userId?: string, ip?: string): string => {
    if (userId) {
        return `user:${userId}`;
    }

    return `ip:${ip ?? "unknown"}`;
};
