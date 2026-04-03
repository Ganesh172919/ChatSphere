import api from './axios';
import type { ConversationInsight, MemoryReference } from '../types/chat';

export type RoomVisibility = 'public' | 'private';

export interface Room {
  id: string;
  name: string;
  description: string;
  tags: string[];
  maxUsers: number;
  visibility: RoomVisibility;
  memberCount?: number;
  creatorId: string;
  createdAt: string;
  messageCount: number;
  isMember?: boolean;
  currentUserRole?: 'creator' | 'admin' | 'moderator' | 'member' | null;
  privateJoinKey?: string | null;
}

export interface RoomAccess extends Room {
  hasAccess: boolean;
  requiresJoinKey: boolean;
}

export interface RoomDetail extends Room {
  messages: GroupMessage[];
  insight?: ConversationInsight | null;
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
  memoryRefs?: MemoryReference[];
  modelId?: string | null;
  provider?: string | null;
}

export async function fetchRooms(): Promise<Room[]> {
  const { data } = await api.get<Room[]>('/rooms');
  return data;
}

export async function createRoom(
  name: string,
  description: string,
  tags: string[],
  maxUsers: number,
  visibility: RoomVisibility
): Promise<Room> {
  const { data } = await api.post<Room>('/rooms', { name, description, tags, maxUsers, visibility });
  return data;
}

export async function fetchRoomById(id: string): Promise<RoomDetail> {
  const { data } = await api.get<RoomDetail>(`/rooms/${id}`);
  return data;
}

export async function fetchRoomAccess(id: string): Promise<RoomAccess> {
  const { data } = await api.get<RoomAccess>(`/rooms/${id}/access`);
  return data;
}

export async function fetchRoomInsight(id: string, modelId?: string): Promise<ConversationInsight | null> {
  const { data } = await api.get<ConversationInsight | null>(`/rooms/${id}/insights`, {
    params: modelId ? { modelId } : undefined,
  });
  return data;
}

export async function runRoomAction(
  id: string,
  action: 'summarize' | 'extract-tasks' | 'extract-decisions',
  modelId?: string
): Promise<{ summary?: string; decisions?: string[]; actionItems?: ConversationInsight['actionItems']; insight: ConversationInsight }> {
  const { data } = await api.post<{ summary?: string; decisions?: string[]; actionItems?: ConversationInsight['actionItems']; insight: ConversationInsight }>(
    `/rooms/${id}/actions/${action}`,
    modelId ? { modelId } : {}
  );
  return data;
}

export async function joinRoomById(id: string, joinKey?: string): Promise<Room> {
  const { data } = await api.post<Room>(`/rooms/${id}/join`, joinKey ? { joinKey } : {});
  return data;
}

export async function fetchRoomPrivateKey(id: string): Promise<{ privateJoinKey: string }> {
  const { data } = await api.get<{ privateJoinKey: string }>(`/rooms/${id}/private-key`);
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
