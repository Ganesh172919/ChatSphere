import api from './axios';

export interface BlockedUser {
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
}

export async function reportUser(data: {
  targetId: string;
  reason: string;
  description?: string;
  roomId?: string;
}): Promise<{ id: string; message: string }> {
  const { data: result } = await api.post('/moderation/report', {
    targetType: 'user',
    ...data,
  });
  return result;
}

export async function reportMessage(data: {
  targetId: string;
  reason: string;
  description?: string;
  roomId?: string;
}): Promise<{ id: string; message: string }> {
  const { data: result } = await api.post('/moderation/report', {
    targetType: 'message',
    ...data,
  });
  return result;
}

export async function blockUser(userId: string): Promise<{ message: string }> {
  const { data } = await api.post('/moderation/block', { userId });
  return data;
}

export async function unblockUser(userId: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/moderation/block/${userId}`);
  return data;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data } = await api.get<BlockedUser[]>('/moderation/blocked');
  return data;
}
