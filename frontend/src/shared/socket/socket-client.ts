import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";
import { refreshSession } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth.store";
import { useMessageStore } from "@/features/messages/message.store";
import { useSocketStore } from "@/shared/socket/socket.store";
import type { ApiErrorPayload, RoomMessage } from "@/shared/types/contracts";
import { env } from "@/shared/utils/env";

let socket: Socket | null = null;
let bindingApplied = false;

const bindSocketEvents = (activeSocket: Socket) => {
  if (bindingApplied) {
    return;
  }

  bindingApplied = true;
  const socketState = useSocketStore.getState();
  const messageState = useMessageStore.getState();

  activeSocket.on("connect", () => {
    useSocketStore.getState().setStatus("connected");
    useSocketStore.getState().resetReconnectFailures();
  });

  activeSocket.io.on("reconnect_attempt", () => {
    useSocketStore.getState().setStatus("reconnecting");
  });

  activeSocket.io.on("reconnect_failed", () => {
    useSocketStore.getState().recordReconnectFailure();
  });

  activeSocket.on("disconnect", () => {
    useSocketStore.getState().setStatus("disconnected");
  });

  activeSocket.on("connect_error", async (error) => {
    useSocketStore.getState().setStatus("reconnecting");

    if (/unauthorized/i.test(error.message)) {
      try {
        const refreshed = await refreshSession();
        useAuthStore.getState().setSession(refreshed);
        activeSocket.auth = { token: refreshed.accessToken };
        activeSocket.connect();
      } catch {
        useAuthStore.getState().clearSession();
      }
      return;
    }

    useSocketStore.getState().recordReconnectFailure();
  });

  activeSocket.on("presence_update", (payload) => {
    socketState.upsertPresence(payload);
  });

  activeSocket.on("typing_start", (payload) => {
    useSocketStore.getState().startTyping(payload);
  });

  activeSocket.on("typing_stop", (payload) => {
    useSocketStore.getState().stopTyping(payload);
  });

  activeSocket.on("messages_read", (payload) => {
    useMessageStore.getState().markMessagesRead(payload);
  });

  activeSocket.on("message_created", (message: RoomMessage) => {
    messageState.upsertRoomMessage(message.roomId, message);
  });

  activeSocket.on("message_updated", (message: RoomMessage) => {
    useMessageStore.getState().upsertRoomMessage(message.roomId, message);
  });

  activeSocket.on("message_deleted", (message: RoomMessage) => {
    useMessageStore.getState().upsertRoomMessage(message.roomId, message);
  });

  activeSocket.on("message_pinned", (message: RoomMessage) => {
    useMessageStore.getState().upsertRoomMessage(message.roomId, message);
  });

  activeSocket.on("message_unpinned", (message: RoomMessage) => {
    useMessageStore.getState().upsertRoomMessage(message.roomId, message);
  });

  activeSocket.on("message_reaction", (message: RoomMessage) => {
    useMessageStore.getState().upsertRoomMessage(message.roomId, message);
  });

  activeSocket.on("ai_thinking", (payload: { roomId: string; thinking: boolean }) => {
    useSocketStore.getState().setAiThinking(payload.roomId, payload.thinking);
  });

  activeSocket.on("socket_error", (payload: ApiErrorPayload) => {
    toast.error(payload.message);
  });
};

export const ensureSocketConnection = (accessToken: string) => {
  if (socket && socket.connected && (socket.auth as { token?: string } | undefined)?.token === accessToken) {
    return socket;
  }

  if (socket) {
    socket.auth = { token: accessToken };
    socket.connect();
    return socket;
  }

  socket = io(env.socketUrl, {
    autoConnect: true,
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: {
      token: accessToken,
    },
  });

  useSocketStore.getState().setStatus("connecting");
  bindSocketEvents(socket);

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
  bindingApplied = false;
};

export const emitSocketEvent = <T>(event: string, payload: object) => {
  return new Promise<T>((resolve, reject) => {
    const activeSocket = getSocket();

    if (!activeSocket) {
      reject(new Error("Socket is not connected"));
      return;
    }

    activeSocket.emit(event, payload, (ack?: { success?: boolean; data?: T; message?: string }) => {
      if (ack?.success === false) {
        reject(new Error(ack.message ?? "Socket action failed"));
        return;
      }

      resolve((ack?.data ?? ack) as T);
    });
  });
};
