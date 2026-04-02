import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { refreshAccessToken } from '../api/auth';
import { useAuthStore } from '../store/authStore';

type SocketAck = {
  success: boolean;
  error?: string;
  [key: string]: unknown;
};

let globalSocket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      socketRef.current = null;
      return;
    }

    if (globalSocket) {
      const currentToken = (globalSocket.auth as { token?: string } | undefined)?.token;
      if (currentToken !== accessToken) {
        globalSocket.auth = { token: accessToken };
        globalSocket.disconnect();
        globalSocket.connect();
      }

      socketRef.current = globalSocket;
      return;
    }

    const socket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', async (err) => {
      console.error('Socket connection error:', err.message);

      try {
        const tokens = await refreshAccessToken();
        useAuthStore.getState().updateTokens(tokens.accessToken);
        socket.auth = { token: tokens.accessToken };
        socket.connect();
      } catch (refreshError) {
        console.error('Socket token refresh failed:', refreshError);
        useAuthStore.getState().logout();
      }
    });

    globalSocket = socket;
    socketRef.current = socket;

    return () => {
      socketRef.current = globalSocket;
    };
  }, [accessToken, isAuthenticated]);

  const emitWithAck = useCallback(<T extends SocketAck>(event: string, ...args: unknown[]) => {
    const socket = socketRef.current;
    if (!socket) {
      return Promise.resolve({ success: false, error: 'Socket is not connected' } as T);
    }

    return new Promise<T>((resolve) => {
      socket.emit(event, ...args, (response: T | undefined) => {
        resolve(response || ({ success: false, error: 'No response from socket server' } as T));
      });
    });
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    return emitWithAck('join_room', roomId);
  }, [emitWithAck]);

  const leaveRoom = useCallback((roomId: string) => {
    return emitWithAck('leave_room', roomId);
  }, [emitWithAck]);

  const sendMessage = useCallback((roomId: string, content: string) => {
    return emitWithAck('send_message', { roomId, content });
  }, [emitWithAck]);

  const sendFileMessage = useCallback((roomId: string, content: string, fileData: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => {
    return emitWithAck('send_message', {
      roomId,
      content,
      ...fileData,
    });
  }, [emitWithAck]);

  const replyMessage = useCallback((roomId: string, content: string, replyToId: string) => {
    return emitWithAck('reply_message', { roomId, content, replyToId });
  }, [emitWithAck]);

  const addReaction = useCallback((roomId: string, messageId: string, emoji: string) => {
    return emitWithAck('add_reaction', { roomId, messageId, emoji });
  }, [emitWithAck]);

  const triggerAi = useCallback((roomId: string, prompt: string, modelId?: string, attachment?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) => {
    return emitWithAck('trigger_ai', { roomId, prompt, modelId, attachment });
  }, [emitWithAck]);

  const editMessage = useCallback((roomId: string, messageId: string, newContent: string) => {
    return emitWithAck('edit_message', { roomId, messageId, newContent });
  }, [emitWithAck]);

  const deleteMessage = useCallback((roomId: string, messageId: string) => {
    return emitWithAck('delete_message', { roomId, messageId });
  }, [emitWithAck]);

  const emitTyping = useCallback((roomId: string) => {
    void emitWithAck('typing_start', { roomId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      void emitWithAck('typing_stop', { roomId });
    }, 2000);
  }, [emitWithAck]);

  const stopTyping = useCallback((roomId: string) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    return emitWithAck('typing_stop', { roomId });
  }, [emitWithAck]);

  const markAsRead = useCallback((roomId: string, messageIds: string[]) => {
    if (messageIds.length === 0) {
      return Promise.resolve({ success: true } as SocketAck);
    }

    return emitWithAck('mark_read', { roomId, messageIds });
  }, [emitWithAck]);

  const pinMessage = useCallback((roomId: string, messageId: string) => {
    return emitWithAck('pin_message', { roomId, messageId });
  }, [emitWithAck]);

  const unpinMessage = useCallback((roomId: string, messageId: string) => {
    return emitWithAck('unpin_message', { roomId, messageId });
  }, [emitWithAck]);

  const disconnect = useCallback(() => {
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }
    socketRef.current = null;
  }, []);

  return {
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendFileMessage,
    replyMessage,
    addReaction,
    triggerAi,
    editMessage,
    deleteMessage,
    emitTyping,
    stopTyping,
    markAsRead,
    pinMessage,
    unpinMessage,
    disconnect,
  };
}
