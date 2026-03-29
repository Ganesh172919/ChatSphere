type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEY_PATTERNS = [
    /password/i,
    /token/i,
    /secret/i,
    /authorization/i,
    /cookie/i,
    /api[_-]?key/i,
    /set-cookie/i,
];

const isSensitiveKey = (key: string): boolean => {
    return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
};

const normalizeError = (value: Error): Record<string, unknown> => {
    return {
        name: value.name,
        message: value.message,
        stack: value.stack,
    };
};

const redactRecursive = (value: unknown, parentKey = ""): unknown => {
    if (value instanceof Error) {
        return normalizeError(value);
    }

    if (Array.isArray(value)) {
        return value.map((entry) => redactRecursive(entry, parentKey));
    }

    if (value && typeof value === "object") {
        const safeObject: Record<string, unknown> = {};

        for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
            if (isSensitiveKey(key) || isSensitiveKey(parentKey)) {
                safeObject[key] = "[REDACTED]";
                continue;
            }

            safeObject[key] = redactRecursive(nestedValue, key);
        }

        return safeObject;
    }

    return value;
};

const write = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(meta ? { meta: redactRecursive(meta) } : {}),
    };

    const serialized = JSON.stringify(payload);

    if (level === "error") {
        console.error(serialized);
        return;
    }

    console.log(serialized);
};

export const logger = {
    debug: (message: string, meta?: Record<string, unknown>): void => {
        write("debug", message, meta);
    },
    info: (message: string, meta?: Record<string, unknown>): void => {
        write("info", message, meta);
    },
    warn: (message: string, meta?: Record<string, unknown>): void => {
        write("warn", message, meta);
    },
    error: (message: string, meta?: Record<string, unknown>): void => {
        write("error", message, meta);
    },
};
