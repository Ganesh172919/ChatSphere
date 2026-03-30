import type { MessagesReadPayload, RoomMessage } from "@/shared/types/contracts";

export interface StoredRoomMessage extends RoomMessage {
  pending?: boolean;
  clientTempId?: string;
}

export interface RoomMessageCollection {
  order: string[];
  entities: Record<string, StoredRoomMessage>;
}

export interface MessagesState {
  rooms: Record<string, RoomMessageCollection>;
}

const ensureRoom = (state: MessagesState, roomId: string): RoomMessageCollection => {
  return (
    state.rooms[roomId] ?? {
      order: [],
      entities: {},
    }
  );
};

const sortIds = (room: RoomMessageCollection) => {
  room.order = Array.from(new Set(room.order)).sort((left, right) => {
    const leftCreated = new Date(room.entities[left]?.createdAt ?? 0).getTime();
    const rightCreated = new Date(room.entities[right]?.createdAt ?? 0).getTime();
    return leftCreated - rightCreated;
  });
};

const getReplyTargetId = (message: Pick<RoomMessage, "replyTo">) => {
  return message.replyTo?.messageId ?? null;
};

const getAttachmentFingerprint = (
  message: Pick<RoomMessage, "fileUrl" | "fileName" | "fileType" | "fileSize">
) => {
  return [
    message.fileUrl ?? "",
    message.fileName ?? "",
    message.fileType ?? "",
    String(message.fileSize ?? ""),
  ].join("|");
};

const findMatchingOptimisticMessageId = (room: RoomMessageCollection, message: RoomMessage) => {
  return room.order.find((id) => {
    const candidate = room.entities[id];

    if (!candidate?.pending) {
      return false;
    }

    const createdDelta = Math.abs(
      new Date(candidate.createdAt ?? 0).getTime() - new Date(message.createdAt ?? 0).getTime()
    );

    return (
      candidate.userId === message.userId &&
      candidate.roomId === message.roomId &&
      candidate.content === message.content &&
      candidate.isAI === message.isAI &&
      getReplyTargetId(candidate) === getReplyTargetId(message) &&
      getAttachmentFingerprint(candidate) === getAttachmentFingerprint(message) &&
      createdDelta <= 30_000
    );
  });
};

export const hydrateRoomMessages = (
  state: MessagesState,
  roomId: string,
  messages: RoomMessage[]
): MessagesState => {
  const room: RoomMessageCollection = {
    order: [],
    entities: {},
  };

  messages.forEach((message) => {
    room.order.push(message.id);
    room.entities[message.id] = message;
  });

  sortIds(room);

  return {
    ...state,
    rooms: {
      ...state.rooms,
      [roomId]: room,
    },
  };
};

export const upsertRoomMessage = (
  state: MessagesState,
  roomId: string,
  message: RoomMessage
): MessagesState => {
  const room = ensureRoom(state, roomId);
  const matchingOptimisticId = findMatchingOptimisticMessageId(room, message);
  const optimisticMessage = matchingOptimisticId ? room.entities[matchingOptimisticId] : undefined;
  const next: RoomMessageCollection = {
    order: room.order.filter((id) => id !== matchingOptimisticId),
    entities: {
      ...room.entities,
      [message.id]: {
        ...optimisticMessage,
        ...room.entities[message.id],
        ...message,
        pending: false,
      },
    },
  };

  if (matchingOptimisticId && matchingOptimisticId !== message.id) {
    delete next.entities[matchingOptimisticId];
  }

  if (!next.order.includes(message.id)) {
    next.order.push(message.id);
  }

  Object.entries(next.entities).forEach(([key, item]) => {
    if (item.clientTempId && item.clientTempId === message.id && key !== message.id) {
      delete next.entities[key];
      next.order = next.order.filter((current) => current !== key);
    }
  });

  sortIds(next);

  return {
    ...state,
    rooms: {
      ...state.rooms,
      [roomId]: next,
    },
  };
};

export const addOptimisticRoomMessage = (
  state: MessagesState,
  roomId: string,
  message: StoredRoomMessage
): MessagesState => {
  const room = ensureRoom(state, roomId);
  const next: RoomMessageCollection = {
    order: [...room.order, message.id],
    entities: {
      ...room.entities,
      [message.id]: {
        ...message,
        pending: true,
      },
    },
  };

  sortIds(next);

  return {
    ...state,
    rooms: {
      ...state.rooms,
      [roomId]: next,
    },
  };
};

export const reconcileOptimisticRoomMessage = (
  state: MessagesState,
  roomId: string,
  tempId: string,
  serverMessage: RoomMessage
): MessagesState => {
  const room = ensureRoom(state, roomId);
  const next: RoomMessageCollection = {
    order: room.order.filter((id) => id !== tempId),
    entities: {
      ...room.entities,
    },
  };

  delete next.entities[tempId];
  next.entities[serverMessage.id] = {
    ...serverMessage,
    pending: false,
  };
  next.order.push(serverMessage.id);
  sortIds(next);

  return {
    ...state,
    rooms: {
      ...state.rooms,
      [roomId]: next,
    },
  };
};

export const markRoomMessagesRead = (
  state: MessagesState,
  payload: MessagesReadPayload
): MessagesState => {
  const room = ensureRoom(state, payload.roomId);
  const next: RoomMessageCollection = {
    order: [...room.order],
    entities: { ...room.entities },
  };

  payload.messageIds.forEach((messageId) => {
    const existing = next.entities[messageId];

    if (!existing) {
      return;
    }

    const readBy = Array.from(new Set([...(existing.readBy ?? []), payload.userId]));

    next.entities[messageId] = {
      ...existing,
      readBy,
      status: "READ",
    };
  });

  return {
    ...state,
    rooms: {
      ...state.rooms,
      [payload.roomId]: next,
    },
  };
};
