import api from './axios';
import type { ConversationInsight, MemoryReference } from '../types/chat';

export interface ConversationSummary {
  id: string;
  title: string;
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
  }>;
  createdAt: string;
  updatedAt: string;
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const { data } = await api.get<ConversationSummary[]>('/conversations');
  return data;
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  const { data } = await api.get<ConversationDetail>(`/conversations/${id}`);
  return data;
}

export async function fetchConversationInsight(id: string): Promise<ConversationInsight> {
  const { data } = await api.get<ConversationInsight>(`/conversations/${id}/insights`);
  return data;
}

export async function runConversationAction(
  id: string,
  action: 'summarize' | 'extract-tasks' | 'extract-decisions'
): Promise<{ summary?: string; decisions?: string[]; actionItems?: ConversationInsight['actionItems']; insight: ConversationInsight }> {
  const { data } = await api.post<{ summary?: string; decisions?: string[]; actionItems?: ConversationInsight['actionItems']; insight: ConversationInsight }>(
    `/conversations/${id}/actions/${action}`
  );
  return data;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/conversations/${id}`);
}
