import type { AuthResponse, AuthUser } from "@/shared/types/contracts";
import { apiClient, rawRequest } from "@/shared/api/client";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  newPassword: string;
}

let refreshInFlight: Promise<AuthResponse> | null = null;

export const login = (payload: LoginPayload) =>
  apiClient.post<AuthResponse>("/api/auth/login", payload);

export const register = (payload: RegisterPayload) =>
  apiClient.post<AuthResponse>("/api/auth/register", payload);

export const refreshSession = () => {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      body: {},
      retryAuth: false,
      attachAccessToken: false,
    }).finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

export const logout = () => apiClient.post("/api/auth/logout", {});

export const getMe = () => apiClient.get<AuthUser>("/api/auth/me");

export const requestPasswordReset = (email: string) =>
  apiClient.post("/api/auth/forgot-password", { email });

export const resetPassword = (payload: ResetPasswordPayload) =>
  apiClient.post("/api/auth/reset-password", payload);

export const exchangeGoogleCode = (code: string) =>
  apiClient.post<AuthResponse>("/api/auth/google/exchange", { code });
