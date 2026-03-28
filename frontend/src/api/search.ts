import api from './axios';

export interface SearchResult {
  id: string;
  content: string;
  username: string;
  userId: string;
  roomId: string | null;
  roomName: string | null;
  isAI: boolean;
  isPinned?: boolean;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  timestamp: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchParams {
  q: string;
  roomId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  isAI?: string;
  isPinned?: string;
  hasFile?: string;
  fileType?: string;
  page?: number;
  limit?: number;
}

export interface ConversationSearchResult {
  id: string;
  title: string;
  messageCount: number;
  matchingSnippets: Array<{ role: string; content: string; timestamp: string }>;
  updatedAt: string;
}

export interface ConversationSearchResponse {
  results: ConversationSearchResult[];
  total: number;
  page: number;
  totalPages: number;
}

export async function searchMessages(params: SearchParams): Promise<SearchResponse> {
  const { data } = await api.get<SearchResponse>('/search/messages', { params });
  return data;
}

export async function searchConversations(q: string, page = 1, limit = 20): Promise<ConversationSearchResponse> {
  const { data } = await api.get<ConversationSearchResponse>('/search/conversations', {
    params: { q, page, limit },
  });
  return data;
}
