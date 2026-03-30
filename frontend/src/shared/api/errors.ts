import type { ApiErrorPayload } from "@/shared/types/contracts";

export class ApiError extends Error {
  code: string;
  requestId?: string;
  details?: unknown;
  retryAfterMs?: number;
  status?: number;

  constructor(payload: ApiErrorPayload & { status?: number }) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.requestId = payload.requestId;
    this.details = payload.details;
    this.retryAfterMs = payload.retryAfterMs;
    this.status = payload.status;
  }
}

const codeMessageMap: Record<string, string> = {
  INVALID_CREDENTIALS: "Those credentials did not match an account.",
  GOOGLE_ACCOUNT_ONLY: "This account uses Google sign-in. Continue with Google instead.",
  UNAUTHORIZED: "Your session expired. Please sign in again.",
  OAUTH_UNAVAILABLE: "Google OAuth is not configured on this environment.",
  OAUTH_FAILED: "Google sign-in could not be completed.",
  INVALID_RESET_TOKEN: "The reset link is invalid or expired.",
  ROOM_FULL: "That room is full right now.",
  FORBIDDEN: "You do not have permission for that action.",
  EDIT_WINDOW_EXPIRED: "That message can no longer be edited.",
  AI_QUOTA_EXCEEDED: "AI quota reached for now.",
  AI_RATE_LIMITED: "AI is rate limited. Please retry shortly.",
  FEATURE_DISABLED: "That AI feature is currently disabled in settings.",
  NOT_FOUND: "The requested resource could not be found.",
  CONFLICT: "That value is already in use.",
};

export const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    const mapped = codeMessageMap[error.code];

    if (mapped && error.retryAfterMs) {
      return `${mapped} Retry in ${Math.ceil(error.retryAfterMs / 1000)}s.`;
    }

    return mapped ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};
