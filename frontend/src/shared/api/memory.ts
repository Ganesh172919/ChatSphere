import { apiClient } from "@/shared/api/client";
import type { MemoryEntry } from "@/shared/types/contracts";

export const listMemoryApi = (params?: { search?: string; pinned?: boolean }) => {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (typeof params?.pinned === "boolean") query.set("pinned", String(params.pinned));
  return apiClient.get<MemoryEntry[]>(`/api/memory?${query.toString()}`);
};

export const updateMemoryApi = (
  memoryId: string,
  payload: Partial<{
    summary: string;
    details: string;
    tags: string[];
    pinned: boolean;
  }>
) => apiClient.put<MemoryEntry>(`/api/memory/${memoryId}`, payload);

export const deleteMemoryApi = (memoryId: string) =>
  apiClient.delete(`/api/memory/${memoryId}`);
