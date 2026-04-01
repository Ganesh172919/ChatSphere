import api from './axios';

export interface GroupMember {
  userId: string;
  username: string;
  displayName: string;
  avatar: string | null;
  onlineStatus: 'online' | 'away' | 'offline';
  role: 'admin' | 'moderator' | 'member';
  isCreator: boolean;
  joinedAt: string;
}

export async function fetchMembers(roomId: string): Promise<GroupMember[]> {
  const { data } = await api.get<GroupMember[]>(`/groups/${roomId}/members`);
  return data;
}

export async function updateMemberRole(
  roomId: string,
  userId: string,
  role: 'admin' | 'moderator' | 'member'
): Promise<{ userId: string; role: string; message: string }> {
  const { data } = await api.put(`/groups/${roomId}/members/${userId}/role`, { role });
  return data;
}

export async function kickMember(
  roomId: string,
  userId: string
): Promise<{ message: string }> {
  const { data } = await api.delete(`/groups/${roomId}/members/${userId}`);
  return data;
}
