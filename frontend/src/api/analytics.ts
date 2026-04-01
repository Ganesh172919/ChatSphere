import api from './axios';

export interface TimeSeriesData {
  date: string;
  count: number;
}

export interface TopRoom {
  roomId: string;
  name: string;
  description: string;
  messageCount: number;
  lastActivity: string;
}

export async function fetchMessageAnalytics(
  days = 30
): Promise<{ data: TimeSeriesData[]; total: number }> {
  const { data } = await api.get('/analytics/messages', { params: { days } });
  return data;
}

export async function fetchUserAnalytics(
  days = 30
): Promise<{ data: TimeSeriesData[] }> {
  const { data } = await api.get('/analytics/users', { params: { days } });
  return data;
}

export async function fetchTopRooms(
  limit = 10
): Promise<{ data: TopRoom[] }> {
  const { data } = await api.get('/analytics/rooms', { params: { limit } });
  return data;
}
