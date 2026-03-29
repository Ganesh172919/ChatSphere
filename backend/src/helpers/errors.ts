export class AppError extends Error {
    statusCode: number;
    code: string;
    details?: unknown;
    retryAfterMs?: number;

    constructor(
        message: string,
        statusCode = 400,
        code = "BAD_REQUEST",
        details?: unknown,
        retryAfterMs?: number
    ) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.retryAfterMs = retryAfterMs;
    }
}

export const isAppError = (error: unknown): error is AppError => {
    return error instanceof AppError;
};
