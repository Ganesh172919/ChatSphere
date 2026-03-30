import { create } from "zustand";
import type { PresenceUpdate, TypingPayload } from "@/shared/types/contracts";

interface SocketStoreState {
  status: "disconnected" | "connecting" | "connected" | "reconnecting";
  reconnectFailures: number;
  presence: Record<string, PresenceUpdate>;
  typingByRoom: Record<string, TypingPayload[]>;
  aiThinkingByRoom: Record<string, boolean>;
  setStatus: (status: SocketStoreState["status"]) => void;
  recordReconnectFailure: () => void;
  resetReconnectFailures: () => void;
  upsertPresence: (payload: PresenceUpdate) => void;
  startTyping: (payload: TypingPayload) => void;
  stopTyping: (payload: TypingPayload) => void;
  setAiThinking: (roomId: string, thinking: boolean) => void;
  clearRoomTransientState: (roomId: string) => void;
}

export const useSocketStore = create<SocketStoreState>((set) => ({
  status: "disconnected",
  reconnectFailures: 0,
  presence: {},
  typingByRoom: {},
  aiThinkingByRoom: {},
  setStatus: (status) => set({ status }),
  recordReconnectFailure: () =>
    set((state) => ({ reconnectFailures: state.reconnectFailures + 1 })),
  resetReconnectFailures: () => set({ reconnectFailures: 0 }),
  upsertPresence: (payload) =>
    set((state) => ({
      presence: {
        ...state.presence,
        [payload.userId]: payload,
      },
    })),
  startTyping: (payload) =>
    set((state) => {
      const roomTyping = state.typingByRoom[payload.roomId] ?? [];
      const nextRoomTyping = roomTyping.filter((entry) => entry.userId !== payload.userId);
      nextRoomTyping.push(payload);

      return {
        typingByRoom: {
          ...state.typingByRoom,
          [payload.roomId]: nextRoomTyping,
        },
      };
    }),
  stopTyping: (payload) =>
    set((state) => ({
      typingByRoom: {
        ...state.typingByRoom,
        [payload.roomId]: (state.typingByRoom[payload.roomId] ?? []).filter(
          (entry) => entry.userId !== payload.userId
        ),
      },
    })),
  setAiThinking: (roomId, thinking) =>
    set((state) => ({
      aiThinkingByRoom: {
        ...state.aiThinkingByRoom,
        [roomId]: thinking,
      },
    })),
  clearRoomTransientState: (roomId) =>
    set((state) => {
      const typingByRoom = { ...state.typingByRoom };
      const aiThinkingByRoom = { ...state.aiThinkingByRoom };
      delete typingByRoom[roomId];
      delete aiThinkingByRoom[roomId];
      return {
        typingByRoom,
        aiThinkingByRoom,
      };
    }),
}));
