import { apiClient } from "@/shared/api/client";
import type {
  AiModelCatalog,
  ConversationDetail,
  ConversationSummary,
  Insight,
  ProjectSummary,
  SoloChatResult,
} from "@/shared/types/contracts";

export interface SendChatPayload {
  message: string;
  conversationId?: string;
  modelId?: string;
  projectId?: string;
  attachment?: {
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    textContent?: string;
    base64?: string;
  };
}

export type ConversationAction = "summarize" | "extract-tasks" | "extract-decisions";

export const listConversations = () =>
  apiClient.get<ConversationSummary[]>("/api/conversations");

export const getConversation = (conversationId: string) =>
  apiClient.get<ConversationDetail>(`/api/conversations/${conversationId}`);

export const getConversationInsight = (conversationId: string) =>
  apiClient.get<Insight | null>(`/api/conversations/${conversationId}/insights`);

export const runConversationAction = (conversationId: string, action: ConversationAction) =>
  apiClient.post<Record<string, unknown>>(`/api/conversations/${conversationId}/actions`, {
    action,
  });

export const deleteConversation = (conversationId: string) =>
  apiClient.delete<{ success: true }>(`/api/conversations/${conversationId}`);

export const sendChat = (payload: SendChatPayload) =>
  apiClient.post<SoloChatResult>("/api/chat", payload);

export const listAiModels = () => apiClient.get<AiModelCatalog>("/api/ai/models");

export const listProjects = () => apiClient.get<ProjectSummary[]>("/api/projects");
