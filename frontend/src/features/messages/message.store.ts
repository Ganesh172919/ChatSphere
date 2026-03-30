import { create } from "zustand";
import type { MessagesReadPayload, RoomMessage } from "@/shared/types/contracts";
import {
  addOptimisticRoomMessage,
  hydrateRoomMessages,
  markRoomMessagesRead,
  reconcileOptimisticRoomMessage,
  type StoredRoomMessage,
  type MessagesState,
  upsertRoomMessage,
} from "@/features/messages/reducer";

interface MessageStoreState extends MessagesState {
  hydrateRoom: (roomId: string, messages: RoomMessage[]) => void;
  upsertRoomMessage: (roomId: string, message: RoomMessage) => void;
  addOptimisticRoomMessage: (roomId: string, message: StoredRoomMessage) => void;
  reconcileOptimisticRoomMessage: (
    roomId: string,
    tempId: string,
    serverMessage: RoomMessage
  ) => void;
  markMessagesRead: (payload: MessagesReadPayload) => void;
  clearRoom: (roomId: string) => void;
}

export const useMessageStore = create<MessageStoreState>((set) => ({
  rooms: {},
  hydrateRoom: (roomId, messages) =>
    set((state) => hydrateRoomMessages(state, roomId, messages)),
  upsertRoomMessage: (roomId, message) =>
    set((state) => upsertRoomMessage(state, roomId, message)),
  addOptimisticRoomMessage: (roomId, message) =>
    set((state) => addOptimisticRoomMessage(state, roomId, message)),
  reconcileOptimisticRoomMessage: (roomId, tempId, serverMessage) =>
    set((state) => reconcileOptimisticRoomMessage(state, roomId, tempId, serverMessage)),
  markMessagesRead: (payload) =>
    set((state) => markRoomMessagesRead(state, payload)),
  clearRoom: (roomId) =>
    set((state) => {
      const rooms = { ...state.rooms };
      delete rooms[roomId];
      return { rooms };
    }),
}));
