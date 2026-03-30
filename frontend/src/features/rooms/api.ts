import { apiClient } from "@/shared/api/client";
import type { Poll, RoomDetail, RoomMember, RoomMessagePage, RoomSummary } from "@/shared/types/contracts";

export interface CreateRoomPayload {
  name: string;
  description?: string;
  tags?: string[];
  maxUsers?: number;
}

export interface RoomMessagePayload {
  content: string;
  roomId: string;
  replyTo?: {
    messageId: string;
    snippet?: string;
  };
  file?: {
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };
}

export const listRooms = () => apiClient.get<RoomSummary[]>("/api/rooms");
export const createRoom = (payload: CreateRoomPayload) => apiClient.post<RoomDetail>("/api/rooms", payload);
export const joinRoom = (roomId: string) => apiClient.post(`/api/rooms/${roomId}/join`, {});
export const leaveRoom = (roomId: string) => apiClient.post(`/api/rooms/${roomId}/leave`, {});
export const getRoom = (roomId: string) => apiClient.get<RoomDetail>(`/api/rooms/${roomId}`);
export const getRoomMessages = (roomId: string, limit = 100, skip = 0) =>
  apiClient.get<RoomMessagePage>(`/api/rooms/${roomId}/messages?limit=${limit}&skip=${skip}`);
export const getPinnedMessages = (roomId: string) =>
  apiClient.get(`/api/rooms/${roomId}/pinned`);

export const getGroupMembers = (roomId: string) =>
  apiClient.get<RoomMember[]>(`/api/groups/${roomId}/members`);

export const updateGroupMemberRole = (roomId: string, userId: string, role: RoomMember["role"]) =>
  apiClient.put(`/api/groups/${roomId}/members/${userId}/role`, { role });

export const removeGroupMember = (roomId: string, userId: string) =>
  apiClient.delete(`/api/groups/${roomId}/members/${userId}`);

export const listRoomPolls = (roomId: string) =>
  apiClient.get<Poll[]>(`/api/polls/room/${roomId}`);

export const createPoll = (payload: {
  roomId: string;
  question: string;
  options: string[];
  allowMultipleVotes?: boolean;
  anonymous?: boolean;
  expiresAt?: string;
}) => apiClient.post<Poll>("/api/polls", payload);

export const votePoll = (pollId: string, optionId: string) =>
  apiClient.post<Poll>(`/api/polls/${pollId}/vote`, { optionId });

export const closePoll = (pollId: string) => apiClient.post<Poll>(`/api/polls/${pollId}/close`, {});
