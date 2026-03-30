import { apiClient } from "@/shared/api/client";
import type { AuthUser, UserSettings } from "@/shared/types/contracts";

export const getSettings = () => apiClient.get<UserSettings>("/api/settings");
export const updateSettings = (payload: Partial<UserSettings>) =>
  apiClient.put<UserSettings>("/api/settings", payload);

export const updateProfile = (payload: {
  displayName?: string;
  bio?: string;
  avatar?: string;
}) => apiClient.put<AuthUser>("/api/users/profile", payload);
