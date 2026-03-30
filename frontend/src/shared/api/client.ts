import { useAuthStore } from "@/features/auth/auth.store";
import { refreshSession } from "@/features/auth/api";
import { ApiError } from "@/shared/api/errors";
import type {
  ApiEnvelope,
  ApiFailureEnvelope,
  ApiErrorPayload,
} from "@/shared/types/contracts";
import { env } from "@/shared/utils/env";

type RequestBody = BodyInit | object | undefined;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: RequestBody;
  retryAuth?: boolean;
  attachAccessToken?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

const isFormData = (value: RequestBody): value is FormData => value instanceof FormData;

const shouldUseJsonBody = (body: RequestBody) => {
  if (!body) {
    return false;
  }

  if (typeof body === "string" || body instanceof Blob || isFormData(body)) {
    return false;
  }

  return true;
};

const redirectToLogin = () => {
  const pathname = window.location.pathname;
  const publicRoute = ["/login", "/register", "/forgot-password", "/reset-password", "/oauth/google"].some(
    (route) => pathname.startsWith(route)
  );

  if (!publicRoute) {
    window.location.assign("/login");
  }
};

const parseJson = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ApiEnvelope<unknown> | ApiFailureEnvelope;
  } catch {
    return null;
  }
};

const normalizeFailure = (payload: unknown, status: number): ApiError => {
  const error =
    payload && typeof payload === "object" && "error" in payload
      ? (payload as ApiFailureEnvelope).error
      : ({
          code: status === 401 ? "UNAUTHORIZED" : "INTERNAL_SERVER_ERROR",
          message: "Unexpected response from server",
        } satisfies ApiErrorPayload);

  return new ApiError({ ...error, status });
};

const getHeaders = (options: RequestOptions) => {
  const headers = new Headers(options.headers);
  const token = useAuthStore.getState().accessToken;

  if (options.attachAccessToken !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (shouldUseJsonBody(options.body)) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
};

const serializeBody = (body: RequestBody) => {
  if (!body) {
    return undefined;
  }

  if (typeof body === "string" || body instanceof Blob || isFormData(body)) {
    return body;
  }

  return JSON.stringify(body);
};

const runRefreshFlow = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshSession()
      .then((response) => {
        useAuthStore.getState().setSession(response);
        return response.accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        redirectToLogin();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const rawRequest = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: getHeaders(options),
    credentials: "include",
    body: serializeBody(options.body),
  });

  const payload = await parseJson(response);

  if (response.status === 401 && options.retryAuth !== false) {
    const refreshed = await runRefreshFlow();

    if (refreshed) {
      return rawRequest<T>(path, { ...options, retryAuth: false });
    }
  }

  if (!response.ok) {
    throw normalizeFailure(payload, response.status);
  }

  if (payload && typeof payload === "object" && "success" in payload && payload.success) {
    return payload.data as T;
  }

  return payload as T;
};

export const apiClient = {
  get: <T>(path: string) => rawRequest<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body?: RequestBody) =>
    rawRequest<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body?: RequestBody) =>
    rawRequest<T>(path, { method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: RequestBody) =>
    rawRequest<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) => rawRequest<T>(path, { method: "DELETE" }),
  upload: <T = unknown>(path: string, formData: FormData) =>
    rawRequest<T>(path, {
      method: "POST",
      body: formData,
    }),
};
