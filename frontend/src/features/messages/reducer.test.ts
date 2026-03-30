import { describe, expect, it } from "vitest";
import {
  addOptimisticRoomMessage,
  hydrateRoomMessages,
  markRoomMessagesRead,
  reconcileOptimisticRoomMessage,
  upsertRoomMessage,
  type MessagesState,
  type StoredRoomMessage,
} from "@/features/messages/reducer";
import type { RoomMessage } from "@/shared/types/contracts";

const baseState: MessagesState = {
  rooms: {},
};

const serverMessage: RoomMessage = {
  id: "message-1",
  roomId: "room-1",
  userId: "user-1",
  username: "captain",
  content: "Confirmed",
  isAI: false,
  status: "DELIVERED",
  readBy: [],
  reactions: {},
  isPinned: false,
  isEdited: false,
  isDeleted: false,
  createdAt: "2026-03-29T00:00:00.000Z",
  updatedAt: "2026-03-29T00:00:00.000Z",
};

describe("message reducer", () => {
  it("hydrates a room and preserves chronological order", () => {
    const laterMessage = {
      ...serverMessage,
      id: "message-2",
      createdAt: "2026-03-29T00:01:00.000Z",
      updatedAt: "2026-03-29T00:01:00.000Z",
    };

    const next = hydrateRoomMessages(baseState, "room-1", [laterMessage, serverMessage]);

    expect(next.rooms["room-1"].order).toEqual(["message-1", "message-2"]);
  });

  it("reconciles an optimistic message with the server payload", () => {
    const optimistic: StoredRoomMessage = {
      ...serverMessage,
      id: "temp-1",
      clientTempId: "temp-1",
      content: "Pending",
      pending: true,
    };

    const withOptimistic = addOptimisticRoomMessage(baseState, "room-1", optimistic);
    const reconciled = reconcileOptimisticRoomMessage(withOptimistic, "room-1", "temp-1", serverMessage);

    expect(reconciled.rooms["room-1"].order).toEqual(["message-1"]);
    expect(reconciled.rooms["room-1"].entities["temp-1"]).toBeUndefined();
    expect(reconciled.rooms["room-1"].entities["message-1"].pending).toBe(false);
    expect(reconciled.rooms["room-1"].entities["message-1"].content).toBe("Confirmed");
  });

  it("collapses a matching optimistic message when the realtime event arrives first", () => {
    const optimistic: StoredRoomMessage = {
      ...serverMessage,
      id: "temp-2",
      clientTempId: "temp-2",
      content: "Smoke message",
      pending: true,
      createdAt: "2026-03-29T00:00:01.000Z",
      updatedAt: "2026-03-29T00:00:01.000Z",
    };
    const confirmed: RoomMessage = {
      ...serverMessage,
      id: "message-2",
      content: "Smoke message",
      createdAt: "2026-03-29T00:00:02.000Z",
      updatedAt: "2026-03-29T00:00:02.000Z",
    };

    const withOptimistic = addOptimisticRoomMessage(baseState, "room-1", optimistic);
    const reconciled = upsertRoomMessage(withOptimistic, "room-1", confirmed);

    expect(reconciled.rooms["room-1"].order).toEqual(["message-2"]);
    expect(reconciled.rooms["room-1"].entities["temp-2"]).toBeUndefined();
    expect(reconciled.rooms["room-1"].entities["message-2"].pending).toBe(false);
  });

  it("marks read receipts for a batch of messages", () => {
    const hydrated = hydrateRoomMessages(baseState, "room-1", [serverMessage]);
    const next = markRoomMessagesRead(hydrated, {
      roomId: "room-1",
      userId: "reader-1",
      messageIds: ["message-1"],
    });

    expect(next.rooms["room-1"].entities["message-1"].status).toBe("READ");
    expect(next.rooms["room-1"].entities["message-1"].readBy).toEqual(["reader-1"]);
  });
});
