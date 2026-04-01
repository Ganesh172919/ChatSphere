import api from './axios';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  onlineStatus: string;
  lastSeen: string | null;
  createdAt: string;
}

export async function updateProfile(data: {
  displayName?: string;
  bio?: string;
  avatar?: string | null;
}): Promise<UserProfile> {
  const { data: result } = await api.put<UserProfile>('/users/profile', data);
  return result;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>(`/users/${userId}`);
  return data;
}

export interface PinnedMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  pinnedBy: string;
  pinnedAt: string;
  isAI: boolean;
  reactions: Record<string, string[]>;
}

export async function getPinnedMessages(roomId: string): Promise<PinnedMessage[]> {
  const { data } = await api.get<PinnedMessage[]>(`/rooms/${roomId}/pinned`);
  return data;
}

export async function pinMessage(roomId: string, messageId: string): Promise<void> {
  await api.post(`/rooms/${roomId}/pin/${messageId}`);
}

export async function unpinMessage(roomId: string, messageId: string): Promise<void> {
  await api.delete(`/rooms/${roomId}/pin/${messageId}`);
}
