import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let globalSocket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      return;
    }

    if (globalSocket?.connected) {
      socketRef.current = globalSocket;
      return;
    }

    const socket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    globalSocket = socket;
    socketRef.current = socket;

    return () => {
      // Don't disconnect on component unmount — keep alive
    };
  }, [isAuthenticated, accessToken]);

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('join_room', roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave_room', roomId);
  }, []);

  const sendMessage = useCallback((roomId: string, content: string) => {
    socketRef.current?.emit('send_message', { roomId, content });
  }, []);

  const replyMessage = useCallback((roomId: string, content: string, replyToId: string) => {
    socketRef.current?.emit('reply_message', { roomId, content, replyToId });
  }, []);

  const addReaction = useCallback((roomId: string, messageId: string, emoji: string) => {
    socketRef.current?.emit('add_reaction', { roomId, messageId, emoji });
  }, []);

  const triggerAi = useCallback((roomId: string, prompt: string) => {
    socketRef.current?.emit('trigger_ai', { roomId, prompt });
  }, []);

  // Typing indicators with debounce
  const emitTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing_start', { roomId });

    // Auto-stop after 2 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { roomId });
    }, 2000);
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socketRef.current?.emit('typing_stop', { roomId });
  }, []);

  // Read receipts
  const markAsRead = useCallback((roomId: string, messageIds: string[]) => {
    if (messageIds.length === 0) return;
    socketRef.current?.emit('mark_read', { roomId, messageIds });
  }, []);

  // Pin/unpin
  const pinMessage = useCallback((roomId: string, messageId: string) => {
    socketRef.current?.emit('pin_message', { roomId, messageId });
  }, []);

  const unpinMessage = useCallback((roomId: string, messageId: string) => {
    socketRef.current?.emit('unpin_message', { roomId, messageId });
  }, []);

  const disconnect = useCallback(() => {
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }
  }, []);

  return {
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    sendMessage,
    replyMessage,
    addReaction,
    triggerAi,
    emitTyping,
    stopTyping,
    markAsRead,
    pinMessage,
    unpinMessage,
    disconnect,
  };
}
