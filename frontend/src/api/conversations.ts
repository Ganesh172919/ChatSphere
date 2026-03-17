import api from './axios';

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
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

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/conversations/${id}`);
}
