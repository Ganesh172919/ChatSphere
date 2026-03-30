import { beforeEach, describe, expect, it } from "vitest";
import { useSocketStore } from "@/shared/socket/socket.store";

describe("socket store", () => {
  beforeEach(() => {
    useSocketStore.setState({
      status: "disconnected",
      reconnectFailures: 0,
      presence: {},
      typingByRoom: {},
      aiThinkingByRoom: {},
    });
  });

  it("tracks presence and typing state per room", () => {
    useSocketStore.getState().upsertPresence({
      userId: "user-1",
      onlineStatus: true,
      lastSeen: "2026-03-29T00:00:00.000Z",
    });
    useSocketStore.getState().startTyping({
      roomId: "room-1",
      userId: "user-1",
      username: "captain",
    });

    expect(useSocketStore.getState().presence["user-1"]?.onlineStatus).toBe(true);
    expect(useSocketStore.getState().typingByRoom["room-1"]).toHaveLength(1);

    useSocketStore.getState().stopTyping({
      roomId: "room-1",
      userId: "user-1",
    });

    expect(useSocketStore.getState().typingByRoom["room-1"]).toEqual([]);
  });

  it("clears transient room state", () => {
    useSocketStore.setState({
      typingByRoom: {
        "room-1": [{ roomId: "room-1", userId: "user-1", username: "captain" }],
      },
      aiThinkingByRoom: {
        "room-1": true,
      },
    });

    useSocketStore.getState().clearRoomTransientState("room-1");

    expect(useSocketStore.getState().typingByRoom["room-1"]).toBeUndefined();
    expect(useSocketStore.getState().aiThinkingByRoom["room-1"]).toBeUndefined();
  });
});
