import api from './axios';

export interface Room {
  id: string;
  name: string;
  description: string;
  tags: string[];
  maxUsers: number;
  memberCount?: number;
  creatorId: string;
  createdAt: string;
  messageCount: number;
}

export interface RoomDetail extends Room {
  messages: GroupMessage[];
}

export interface GroupMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  reactions: Record<string, string[]>;
  replyTo: { id: string; username: string; content: string } | null;
  isAI?: boolean;
  triggeredBy?: string;
  status?: 'sent' | 'delivered' | 'read';
  isPinned?: boolean;
  isEdited?: boolean;
  editedAt?: string | null;
  isDeleted?: boolean;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
}

export async function fetchRooms(): Promise<Room[]> {
  const { data } = await api.get<Room[]>('/rooms');
  return data;
}

export async function createRoom(name: string, description: string, tags: string[], maxUsers: number): Promise<Room> {
  const { data } = await api.post<Room>('/rooms', { name, description, tags, maxUsers });
  return data;
}

export async function fetchRoomById(id: string): Promise<RoomDetail> {
  const { data } = await api.get<RoomDetail>(`/rooms/${id}`);
  return data;
}

export async function deleteRoom(id: string): Promise<void> {
  await api.delete(`/rooms/${id}`);
}

export async function uploadFile(file: File): Promise<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
