import api from './axios';
import type { ConversationInsight, MemoryReference } from '../types/chat';

export interface ConversationSummary {
  id: string;
  title: string;
  project?: {
    id: string;
    name: string;
    description: string;
  } | null;
  messageCount: number;
  lastMessage: string;
  sourceType?: string;
  sourceLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  project?: {
    id: string;
    name: string;
    description: string;
  } | null;
  sourceType?: string;
  sourceLabel?: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
    memoryRefs?: MemoryReference[];
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
    modelId?: string | null;
    provider?: string | null;
    requestedModelId?: string | null;
    processingMs?: number | null;
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
    autoMode?: boolean;
    autoComplexity?: string | null;
    fallbackUsed?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export async function fetchConversations(projectId?: string | null): Promise<ConversationSummary[]> {
  const { data } = await api.get<ConversationSummary[]>('/conversations', {
    params: projectId ? { projectId } : undefined,
  });
  return data;
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const { data } = await api.get<ConversationDetail>(`/conversations/${id}`);
  return data;
}

export async function fetchConversationInsight(id: string, modelId?: string): Promise<ConversationInsight | null> {
  const { data } = await api.get<ConversationInsight | null>(`/conversations/${id}/insights`, {
    params: modelId ? { modelId } : undefined,
  });
  return data;
}

export async function runConversationAction(
  id: string,
  action: 'summarize' | 'extract-tasks' | 'extract-decisions',
  modelId?: string
): Promise<{ summary?: string; decisions?: string[]; actionItems?: ConversationInsight['actionItems']; insight: ConversationInsight }> {
  const { data } = await api.post<{ summary?: string; decisions?: string[]; actionItems?: ConversationInsight['actionItems']; insight: ConversationInsight }>(
    `/conversations/${id}/actions/${action}`,
    modelId ? { modelId } : {}
  );
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/conversations/${id}`);
}
