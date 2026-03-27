import { create } from 'zustand';
import type { Room, GroupMessage } from '../api/rooms';

interface RoomState {
  rooms: Room[];
  currentRoom: (Room & { messages: GroupMessage[] }) | null;
  onlineUsers: Array<{ id: string; username: string }>;
  aiThinking: boolean;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: (Room & { messages: GroupMessage[] }) | null) => void;
  addMessageToCurrentRoom: (message: GroupMessage) => void;
  updateMessageReactions: (messageId: string, reactions: Record<string, string[]>) => void;
  editMessageInCurrentRoom: (messageId: string, content: string, editedAt: string) => void;
  deleteMessageInCurrentRoom: (messageId: string) => void;
  setOnlineUsers: (users: Array<{ id: string; username: string }>) => void;
  setAiThinking: (status: boolean) => void;
  clearCurrentRoom: () => void;
}

export const useRoomStore = create<RoomState>()((set) => ({
  rooms: [],
  currentRoom: null,
  onlineUsers: [],
  aiThinking: false,
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  addMessageToCurrentRoom: (message) =>
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          messages: [...state.currentRoom.messages, message],
        },
      };
    }),
  updateMessageReactions: (messageId, reactions) =>
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          messages: state.currentRoom.messages.map((m) =>
            m.id === messageId ? { ...m, reactions } : m
          ),
        },
      };
    }),
  editMessageInCurrentRoom: (messageId, content, editedAt) =>
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          messages: state.currentRoom.messages.map((m) =>
            m.id === messageId ? { ...m, content, isEdited: true, editedAt } : m
          ),
        },
      };
    }),
  deleteMessageInCurrentRoom: (messageId) =>
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          messages: state.currentRoom.messages.map((m) =>
            m.id === messageId ? { ...m, content: '🗑️ This message was deleted', isDeleted: true } : m
          ),
        },
      };
    }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setAiThinking: (status) => set({ aiThinking: status }),
  clearCurrentRoom: () => set({ currentRoom: null, onlineUsers: [], aiThinking: false }),
}));
