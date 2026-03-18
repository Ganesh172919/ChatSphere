import api from './axios';

export interface SearchResult {
  id: string;
  content: string;
  username: string;
  userId: string;
  roomId: string | null;
  roomName: string | null;
  isAI: boolean;
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
  page?: number;
  limit?: number;
}

export async function searchMessages(params: SearchParams): Promise<SearchResponse> {
  const { data } = await api.get<SearchResponse>('/search/messages', { params });
  return data;
}
